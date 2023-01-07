# consul-balancer

> consul service discovery and balancing

## usage

```bash
npm install consul-balancer
```

```js
import { ConsulBalancer } from "consul-balancer";

const consulBalancer = new ConsulBalancer({
  host: "x.x.x.x",
  port: 8500,
  secure: false,
  discovery: {
    enable: true,
    register: true,
    deregister: true,
    serviceName: "consul-balancer",
    servicePort: 8080,
    healthCheckHTTP: "/healthy",
  },
});
```

## API

- `consulBalancer.getPassingServiceByRandom(serviceName)`: get the info of passing service by random
- `consulBalancer.register()`: registers the discovery service
- `consulBalancer.deregister()`: deregister the discovery service
- `consulBalancer.rest(serviceName, pathName, urlOptions)`: [async function] load balance http utils
