import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import * as path from 'path'
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
    servicePort: 3333,
    // healthCheckHTTP: '/healthy',
  },
  gRPC: {
    port: '50051'
  }
})

it('get service info', async () => {
  const service = await consulBalancer.getPassingServiceByRandom('auth-service')
  expect(service).toBeInstanceOf(Object)
})

it('manual register service', async () => {
  await consulBalancer.register({ id: 'manul-register1', name: 'manual-register', meta: { prefix: '/api' } })
  const service = await consulBalancer.getPassingServiceByRandom('manual-register')
  console.log('manual register service:', service)
})

it('load balance rest', async () => {
  const res = await consulBalancer.rest('auth-service', '/healthy')
  console.log('load balance rest:', res)
})

it('load balance grpc', async () => {
  const options = {
    keepCase: true,
    longs: String,
    enums: String,
    oneofs: true
  }

  const packageDefinition = protoLoader.loadSync(path.join(__dirname, 'hello.proto'), options)
  const { hello: { HelloService } } = grpc.loadPackageDefinition(packageDefinition) as { hello: { HelloService: grpc.ServiceClientConstructor } }

  const res = await consulBalancer.grpc('grpcb.in:9000', HelloService, 'SayHello', { greeting: 'John' })
  console.log('load balance grpc:', res)
})