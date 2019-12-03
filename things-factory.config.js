import route from './client/route'
import bootstrap from './client/bootstrap'

export default {
  route,
  routes: [
    {
      tagname: 'warehouse-list',
      page: 'warehouses'
    },
    {
      tagname: 'location-list',
      page: 'locations'
    }
  ],
  bootstrap
}
