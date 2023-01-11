import { ConsulBalancer } from '../lib'

const consulBalancer = new ConsulBalancer({
  host: '10.20.178.234',
  port: 8500,
  secure: false,
  discovery: {
    enable: true,
    register: true,
    deregister: true,
    serviceName: 'consul-balancer',
    servicePort: 8080,
    healthCheckHTTP: '/healthy',
  },
})

it('get service info', async () => {
  const service = await consulBalancer.getPassingServiceByRandom('auth-service')
  expect(service).toBeInstanceOf(Object)
})

it('manual register service', async () => {
  const res = await consulBalancer.register({ id: 'manul-register1', name: 'manual-register', meta: { prefix: '/api' } })
  console.log(res)
})

it('load balance rest', async () => {
  const res = await consulBalancer.rest('auth-service', '/healthy')
  console.log(res)
})
