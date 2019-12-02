export default function route(page) {
  switch (page) {
    case 'warehouse-ui-main':
      import('./pages/main')
      return page
  }
}
