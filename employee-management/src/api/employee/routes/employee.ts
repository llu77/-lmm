/**
 * employee router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::employee.employee', {
  config: {
    find: {
      middlewares: [],
    },
    findOne: {
      middlewares: [],
    },
    create: {
      middlewares: [],
    },
    update: {
      middlewares: [],
    },
    delete: {
      middlewares: [],
    },
  },
});
