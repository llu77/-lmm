/**
 * employee controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::employee.employee', ({ strapi }) => ({
  // Custom controller methods can be added here

  // Example: Get active employees only
  async findActive(ctx) {
    try {
      const employees = await strapi.entityService.findMany('api::employee.employee', {
        filters: {
          isActive: true,
          employmentStatus: 'active',
        },
        ...ctx.query,
      });

      return employees;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  // Example: Get employees by department
  async findByDepartment(ctx) {
    const { department } = ctx.params;

    try {
      const employees = await strapi.entityService.findMany('api::employee.employee', {
        filters: {
          department: department,
          isActive: true,
        },
        ...ctx.query,
      });

      return employees;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));
