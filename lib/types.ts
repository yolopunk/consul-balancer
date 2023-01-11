export type ConsulOptions = {
  host: string
  port: number
  secure: boolean
  discovery: {
    enable: boolean
    register: boolean
    deregister: boolean
    serviceName: string
    servicePort: number
    healthCheckHTTP?: string
  }
}

export type Service = {
  node: string
  address: string
  port: number
  status: 'passing' | 'warning' | 'critical'
}

export type CheckOptions = {
  http?: string
  tcp?: string
  script?: string
  dockercontainerid?: string
  shell?: string
  interval: string
  timeout?: string
  ttl: string
  notes?: string
  status?: string
  deregistercriticalserviceafter?: string
  successbeforepassing?: number
  failuresbeforecritical?: number
}

export type RegisterOptions = {
  name?: string
  id?: string
  tags?: string[]
  address?: string
  port?: number
  meta?: Record<string, unknown>
  check?: CheckOptions
  checks?: CheckOptions[]
  connect?: Record<string, unknown>
  proxy?: Record<string, unknown>
  taggedAddresses?: Record<string, unknown>
}