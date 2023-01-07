import { ConsulBalancer } from '../lib'

const consulBalancer = new ConsulBalancer({
  host: 'x.x.x.x',
  port: 8500,
  secure: false,
  discovery: {
    enable: true,
    register: true,
    deregister: true,
    serviceName: 'consul-balancer',
    servicePort: 8080,
    healthCheckHTTP: '/healthy',
  }
})

it('get service info', async () => {
  const service = await consulBalancer.getPassingServiceByRandom('auth-service')
  expect(service).toBeInstanceOf(Object)
})

it('registe service', async() => {
  const res = await consulBalancer.register()
  console.log(res)
})

it('load balance rest', async () => {
  const res = await consulBalancer.rest('auth-service', '/healthy')
  console.log(res)
})