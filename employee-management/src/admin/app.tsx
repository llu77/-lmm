import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    // Enable Arabic language for the admin panel
    locales: [
      'ar',
    ],
    // Customize the admin panel theme
    theme: {
      colors: {
        primary100: '#f0f0ff',
        primary200: '#d9d9ff',
        primary500: '#4945ff',
        primary600: '#3c38e6',
        primary700: '#2e2acc',
      },
    },
    // Translations for Arabic
    translations: {
      ar: {
        'app.components.HomePage.welcome': 'مرحباً في لوحة تحكم إدارة الموظفين',
        'app.components.HomePage.welcomeBlock.content': 'نظام متكامل لإدارة بيانات الموظفين',
      },
    },
  },
  bootstrap(app: StrapiApp) {
    console.log('Employee Management System initialized');
  },
};
