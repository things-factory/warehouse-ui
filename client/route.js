export default function route(page) {
  switch (page) {
    case 'warehouses':
      import('./pages/warehouse-list')
      return page
  }
}
