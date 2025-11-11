/**
 * employee service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::employee.employee', ({ strapi }) => ({
  // Custom service methods can be added here

  // Example: Calculate total salary by department
  async calculateDepartmentSalary(department: string) {
    const employees = await strapi.entityService.findMany('api::employee.employee', {
      filters: {
        department: department as any,
        isActive: true,
        employmentStatus: 'active',
      },
      fields: ['salary'],
    });

    const total = employees.reduce((sum: number, emp: any) => sum + (parseFloat(emp.salary?.toString() || '0')), 0);
    return {
      department,
      totalSalary: total,
      employeeCount: employees.length,
    };
  },

  // Example: Get employee statistics
  async getStatistics() {
    const allEmployees = await strapi.entityService.findMany('api::employee.employee', {
      fields: ['employmentStatus', 'department', 'contractType', 'isActive'],
    });

    const stats = {
      total: allEmployees.length,
      active: allEmployees.filter(e => e.isActive && e.employmentStatus === 'active').length,
      byDepartment: {},
      byContractType: {},
      byStatus: {},
    };

    allEmployees.forEach(emp => {
      // Count by department
      stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;

      // Count by contract type
      stats.byContractType[emp.contractType] = (stats.byContractType[emp.contractType] || 0) + 1;

      // Count by status
      stats.byStatus[emp.employmentStatus] = (stats.byStatus[emp.employmentStatus] || 0) + 1;
    });

    return stats;
  },
}));
