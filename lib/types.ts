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