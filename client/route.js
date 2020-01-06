export default function route(page) {
  switch (page) {
    case 'warehouses':
      import('./pages/warehouse-list')
      return page

    case 'locations':
      import('./pages/location-list')
      return page
  }
}
