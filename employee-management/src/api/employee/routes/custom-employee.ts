/**
 * Custom employee routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/employees/active',
      handler: 'employee.findActive',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/employees/department/:department',
      handler: 'employee.findByDepartment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
