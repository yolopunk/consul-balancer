import * as os from 'os'
import Consul from 'consul'
import * as urllib from 'urllib'
import * as grpc from '@grpc/grpc-js'
import { defaults, omit, sample, set } from './utils/lodash'
import type { CheckOptions, ConsulOptions, RegisterOptions, Service } from './types'

export class ConsulBalancer {
  private options: ConsulOptions
  private address: string
  private serviceRegisterId: string
  private cachedServices: Map<
    string,
    { cacheTime: number; services: Service[] }
  > = new Map()

  private conculInstance: Consul.Consul | null = null

  private static defaultOptions: ConsulOptions = {
    host: '127.0.0.1',
    port: 8500,
    secure: false,
    discovery: {
      enable: true,
      register: false, // auto register discovery service
      deregister: true, // auto register discovery service after process exited
      serviceName: '',
      servicePort: 8080,
    }
  }

  constructor(port: number, host: string, options: ConsulOptions)
  constructor(port: number, options: ConsulOptions)
  constructor(port: number, host: string)
  constructor(options: ConsulOptions)
  constructor(port: number)
  constructor(host: string)
  constructor()
  constructor(arg1?: unknown, arg2?: unknown, arg3?: unknown) {
    this.options = this.parseOptions(arg1, arg2, arg3)
    this.address = this.findFirstNonLoopbackHostInfo()
    this.serviceRegisterId = this.getServiceRegisterId()
    if (this.options.discovery.register) {
      this.register()
    }
  }

  getConsulInstance() {
    if (!this.conculInstance) {
      const consulOptions = omit(this.options, 'discovery') as never
      this.conculInstance = new Consul(consulOptions)
    }

    return this.conculInstance
  }

  // default register discovery service
  async register(options: RegisterOptions = {}) {
    const check: CheckOptions = {
      interval: '15s',
      timeout: '10s',
      ttl: '60s',
      deregistercriticalserviceafter: '5m',
    }

    if (this.options.discovery.healthCheckHTTP) {
      check.http = `http://${this.address}:${this.options.discovery.servicePort}${this.options.discovery.healthCheckHTTP}`
    } else {
      check.tcp = `${this.address}:${this.options.discovery.servicePort}`
    }

    if (this.options.gRPC) {
      options.meta ??= {}
      Object.assign(options.meta, { gRPC_port: this.options.gRPC.port })
    }

    const registerOptions = defaults(options, {
      id: this.serviceRegisterId,
      name: this.options.discovery.serviceName,
      address: this.address,
      port: this.options.discovery.servicePort,
      tags: [this.options.discovery.serviceName],
      check,
    }) as Consul.Agent.Service.RegisterOptions

    try {
      return await this.getConsulInstance().agent.service.register(registerOptions) as never
    } catch (e) {
      console.error(`[${new Date()}] consul-balancer register ${e}`)
      throw e
    }
  }

  // default deregister discovery service
  deregister(serviceId?: string) {
    return this.getConsulInstance().agent.service.deregister(
      serviceId ?? this.serviceRegisterId
    )
  }

  /**
   * grpc load balancer
   * @param serviceName - name of the service | address:port
   * @param targe - grpc client instance target
   * @param method - grpc method name
   * @param data - grpc request data
   */
  async grpc(serviceName: string, target: grpc.ServiceClientConstructor, method: string, data: unknown) {
    let service = null
    const [address, port] = serviceName.split(':')

    if (address && port) {
      // directly use address:port
      service = { address, port }
    } else {
      // Get random healthy service
      service = await this.getPassingServiceByRandom(serviceName)
      if (!service) throw new Error(`${serviceName} 服务不可用`)
      if (!service.meta?.['gRPC_port']) {
        throw new Error('gRPC service meta not found gRPC_port')
      }
      service.port = +service.meta['gRPC_port']
    }

    // Create client
    const grpcClient = new target(
      `${service.address}:${service.port}`, 
      grpc.credentials.createInsecure()
    ) as any

    console.log(`[${new Date()}] consul-balancer grpc ~ ${target.serviceName}#${method}`)

    return new Promise((ok, fail) => {
      grpcClient[method](data, (err: Error | null, result: unknown) => {
        if (err) return fail(err)
        return ok(result)
      })
    })
  }

  async rest(
    serviceName: string,
    pathName: string,
    options: urllib.RequestOptions2 = {}
  ) {
    const service = await this.getPassingServiceByRandom(serviceName)
    if (!service) throw new Error(`${serviceName} 服务不可用`)

    const { address, port } = service

    const defaultOptions: urllib.RequestOptions2 = { dataType: 'json' }
    if (!options?.headers?.['content-type']) {
      set(options, ['headers', 'content-type'], 'application/json')
    }

    const { href } = new URL(pathName, `http://${address}:${port}`)

    console.log(`[${new Date()}] consul-balancer rest ~ ${href}`)

    return urllib.curl(href, { ...defaultOptions, ...options })
  }

  async getPassingServiceByRandom(
    serviceName = this.options.discovery.serviceName
  ) {
    let services = await this.getServiceListFromConsul(serviceName)

    if (!services.length) {
      const cache = this.cachedServices.get(this.options.discovery.serviceName)

      if (cache && Date.now() - 60 * 1000 < cache.cacheTime) {
        services = cache.services
      }
    }

    if (services.length) return sample(services)

    return null
  }

  private async getServiceListFromConsul(serviceName: string, passing = true) {
    const serviceList = (await this.getConsulInstance().health.service({
      service: serviceName,
      passing,
    })) as Array<{
      Node: { Node: string }
      Service: { Address: string; Port: number; Meta: Record<string, string> }
      Checks: { ServiceName: string; Status: string }[]
    }>

    const services = (serviceList ?? []).map((service) => {
      const result = {
        node: service.Node.Node,
        address: service.Service.Address,
        port: service.Service.Port,
        meta: service.Service.Meta,
        status: '',
      }

      service.Checks.some((check: { ServiceName: string; Status: string }) => {
        if (check.ServiceName === this.options.discovery.serviceName) {
          result.status = check.Status
          return true
        }

        return false
      })

      return result
    }) as Service[]

    if (services.length) {
      this.cachedServices.set(this.options.discovery.serviceName, {
        services,
        cacheTime: Date.now(),
      })
    }

    return services
  }

  private parseOptions(...args: unknown[]) {
    const options: Partial<ConsulOptions> = {}
    for (const arg of args) {
      if (arg === null || typeof arg === 'undefined') {
        continue
      }

      if (typeof arg === 'object') {
        defaults(options, arg)
      }

      switch (typeof arg) {
        case 'object':
          defaults(options, arg)
          break
        case 'number':
          options.port = arg
          break
        case 'string':
          options.host = arg
          break
        default:
          throw new Error(`[consul-balancer] Invalid argument ${arg}`)
      }
    }

    return defaults(options, ConsulBalancer.defaultOptions)
  }

  private getServiceRegisterId() {
    return [
      this.options.discovery.serviceName,
      this.address,
      this.options.discovery.servicePort,
    ].join('-')
  }

  private findFirstNonLoopbackHostInfo() {
    const netInfo = os.networkInterfaces()

    for (const netName of Object.keys(netInfo)) {
      const net = netInfo[netName]
      for (const addr of net ?? []) {
        if (addr.internal === false && addr.family === 'IPv4') {
          return addr.address
        }
      }
    }

    return this.options.host
  }
}
