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
}
