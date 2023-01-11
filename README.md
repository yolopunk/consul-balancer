# consul-balancer

> consul service discovery and balancing

## usage

```bash
npm install consul-balancer
```

```js
import { ConsulBalancer } from "consul-balancer"

const consulBalancer = new ConsulBalancer({
  host: "x.x.x.x",
  port: 8500,
  secure: false,
  discovery: {
    enable: true,
    register: true, // auto register discovery service
    deregister: true, // auto register discovery service after process exited
    serviceName: "consul-balancer",
    servicePort: 8080,
    healthCheckHTTP: "/healthy",
  },
})
```

## API

- `consulBalancer.getConsulInstance()`: get the consul client instance
- `consulBalancer.getPassingServiceByRandom(serviceName)`: get the info of passing service by random
- `consulBalancer.register(options?: RegisterOptions)`: registers the discovery service
- `consulBalancer.deregister(serviceId?: string)`: deregister the discovery service
- `consulBalancer.rest(serviceName, pathName, urlOptions)`: [async function] load balance http utils
