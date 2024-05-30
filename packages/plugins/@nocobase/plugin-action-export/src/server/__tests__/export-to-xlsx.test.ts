/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { createMockServer, MockServer } from '@nocobase/test';
import { uid } from '@nocobase/utils';
import XlsxExporter from '../xlsx-exporter';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { BaseInterface } from '@nocobase/database';
import moment from 'moment';

XLSX.set_fs(fs);

describe('export to xlsx with preset', () => {
  let app: MockServer;

  beforeEach(async () => {
    app = await createMockServer({
      plugins: ['nocobase'],
    });
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should export with attachment field', async () => {
    const Post = app.db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        {
          name: 'attachment1',
          type: 'belongsToMany',
          interface: 'attachment',
          uiSchema: {
            'x-component-props': {
              accept: 'image/*',
              multiple: true,
            },
            type: 'array',
            'x-component': 'Upload.Attachment',
            title: 'attachment1',
          },
          target: 'attachments',
          storage: 'local',
          through: 'postsAttachments',
        },
      ],
    });

    await app.db.sync();

    await Post.repository.create({
      values: {
        title: 'p1',
        attachment1: [
          {
            title: 'nocobase-logo1',
            filename: '682e5ad037dd02a0fe4800a3e91c283b.png',
            extname: '.png',
            mimetype: 'image/png',
            url: 'https://nocobase.oss-cn-beijing.aliyuncs.com/test1.png',
          },
          {
            title: 'nocobase-logo2',
            filename: '682e5ad037dd02a0fe4800a3e91c283b.png',
            extname: '.png',
            mimetype: 'image/png',
            url: 'https://nocobase.oss-cn-beijing.aliyuncs.com/test2.png',
          },
        ],
      },
    });

    const exporter = new XlsxExporter({
      collection: Post,
      chunkSize: 10,
      columns: [
        { dataIndex: ['title'], defaultTitle: 'Title' },
        {
          dataIndex: ['attachment1'],
          defaultTitle: 'attachment',
        },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      XLSX.writeFile(wb, xlsxFilePath);

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const header = sheetData[0];
      expect(header).toEqual(['Title', 'attachment']);

      const firstUser = sheetData[1];
      expect(firstUser[1]).toEqual(
        'https://nocobase.oss-cn-beijing.aliyuncs.com/test1.png,https://nocobase.oss-cn-beijing.aliyuncs.com/test2.png',
      );
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with china region field', async () => {
    const Post = app.db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        {
          type: 'belongsToMany',
          target: 'chinaRegions',
          through: 'userRegions',
          targetKey: 'code',
          interface: 'chinaRegion',
          name: 'region',
        },
      ],
    });

    await app.db.sync();

    await Post.repository.create({
      values: {
        title: 'post0',
        region: [{ code: '14' }, { code: '1404' }, { code: '140406' }],
      },
    });

    const exporter = new XlsxExporter({
      collection: Post,
      chunkSize: 10,
      columns: [
        { dataIndex: ['title'], defaultTitle: 'Title' },
        {
          dataIndex: ['region'],
          defaultTitle: 'region',
        },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      XLSX.writeFile(wb, xlsxFilePath);

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const header = sheetData[0];
      expect(header).toEqual(['Title', 'region']);

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['post0', '山西省/长治市/潞城区']);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });
});

describe('export to xlsx', () => {
  let app: MockServer;

  beforeEach(async () => {
    app = await createMockServer({
      plugins: ['action-export'],
    });
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should export with json field', async () => {
    const Post = app.db.collection({
      name: 'posts',
      fields: [
        {
          name: 'title',
          type: 'string',
        },
        {
          name: 'json',
          type: 'json',
        },
      ],
    });

    await app.db.sync();

    await Post.repository.create({
      values: {
        title: 'some_title',
        json: {
          a: {
            b: 'c',
          },
        },
      },
    });

    const exporter = new XlsxExporter({
      collection: Post,
      chunkSize: 10,
      columns: [
        { dataIndex: ['title'], defaultTitle: '' },
        {
          dataIndex: ['json'],
          defaultTitle: '',
        },
      ],
    });

    const wb = await exporter.run({});

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      XLSX.writeFile(wb, xlsxFilePath);

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const firstUser = sheetData[1];
      expect(firstUser).toEqual([
        'some_title',
        JSON.stringify({
          a: {
            b: 'c',
          },
        }),
      ]);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with datetime field', async () => {
    const Post = app.db.collection({
      name: 'posts',
      fields: [
        {
          name: 'title',
          type: 'string',
        },
        {
          uiSchema: {
            'x-component-props': { dateFormat: 'YYYY-MM-DD', gmt: false, showTime: true, timeFormat: 'HH:mm:ss' },
            type: 'string',
            'x-component': 'DatePicker',
            title: 'test_date',
          },
          name: 'test_date',
          type: 'date',
          interface: 'datetime',
        },
      ],
    });

    await app.db.sync();

    await Post.repository.create({
      values: {
        title: 'some_title',
        test_date: '2024-05-10T01:42:35.000Z',
      },
    });

    const exporter = new XlsxExporter({
      collection: Post,
      chunkSize: 10,
      columns: [
        { dataIndex: ['title'], defaultTitle: '' },
        {
          dataIndex: ['test_date'],
          defaultTitle: '',
        },
      ],
    });

    const wb = await exporter.run({
      get() {
        return '+08:00';
      },
    });

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      XLSX.writeFile(wb, xlsxFilePath);

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['some_title', '2024-05-10 09:42:35']);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with multi select', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name', title: '姓名' },
        {
          uiSchema: {
            enum: [
              {
                value: '123',
                label: 'Label123',
                color: 'orange',
              },
              {
                value: '223',
                label: 'Label223',
                color: 'lime',
              },
            ],
            type: 'array',
            'x-component': 'Select',
            'x-component-props': {
              mode: 'multiple',
            },
            title: 'multi-select',
          },
          defaultValue: [],
          name: 'multiSelect',
          type: 'array',
          interface: 'multipleSelect',
        },
      ],
    });

    await app.db.sync();

    await User.repository.create({
      values: {
        name: 'u1',
        multiSelect: ['123', '223'],
      },
    });

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        {
          dataIndex: ['multiSelect'],
          defaultTitle: '',
        },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      XLSX.writeFile(wb, xlsxFilePath);

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['u1', 'Label123,Label223']);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with different ui schema', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name', title: '姓名' },
        { type: 'integer', name: 'age', title: '年龄' },
        {
          type: 'integer',
          name: 'testInterface',
          interface: 'testInterface',
          title: 'Interface 测试',
          uiSchema: { test: 'testValue' },
        },
      ],
    });

    class TestInterface extends BaseInterface {
      toString(value, ctx) {
        return `${this.options.uiSchema.test}.${value}`;
      }
    }

    app.db.interfaceManager.registerInterfaceType('testInterface', TestInterface);

    await app.db.sync();
    const values = Array.from({ length: 20 }).map((_, index) => {
      return {
        name: `user${index}`,
        age: index % 100,
        testInterface: index,
      };
    });

    await User.model.bulkCreate(values);

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        {
          dataIndex: ['testInterface'],
          defaultTitle: '',
        },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      await new Promise((resolve, reject) => {
        XLSX.writeFileAsync(
          xlsxFilePath,
          wb,
          {
            type: 'array',
          },
          () => {
            resolve(123);
          },
        );
      });

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const header = sheetData[0];
      expect(header).toEqual(['姓名', 'Interface 测试']);

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['user0', 'testValue.0']);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with empty title', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name', title: '姓名' },
        { type: 'integer', name: 'age', title: '年龄' },
      ],
    });

    await app.db.sync();
    const values = Array.from({ length: 20 }).map((_, index) => {
      return {
        name: `user${index}`,
        age: index % 100,
      };
    });

    await User.model.bulkCreate(values);

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        { dataIndex: ['age'], defaultTitle: 'Age' },
      ],
      findOptions: {
        filter: {
          age: {
            $gt: 9,
          },
        },
      },
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      await new Promise((resolve, reject) => {
        XLSX.writeFileAsync(
          xlsxFilePath,
          wb,
          {
            type: 'array',
          },
          () => {
            resolve(123);
          },
        );
      });

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const header = sheetData[0];
      expect(header).toEqual(['姓名', '年龄']);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with filter', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'integer', name: 'age' },
      ],
    });

    await app.db.sync();

    const values = Array.from({ length: 20 }).map((_, index) => {
      return {
        name: `user${index}`,
        age: index % 100,
      };
    });

    await User.model.bulkCreate(values);

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        { dataIndex: ['age'], defaultTitle: 'Age' },
      ],
      findOptions: {
        filter: {
          age: {
            $gt: 9,
          },
        },
      },
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      await new Promise((resolve, reject) => {
        XLSX.writeFileAsync(
          xlsxFilePath,
          wb,
          {
            type: 'array',
          },
          () => {
            resolve(123);
          },
        );
      });

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      expect(sheetData.length).toBe(11); // 10 users + 1 header

      const header = sheetData[0];
      expect(header).toEqual(['Name', 'Age']);

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['user10', 10]);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export with associations', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'integer', name: 'age' },
        {
          type: 'hasMany',
          name: 'posts',
          target: 'posts',
        },
        {
          type: 'belongsToMany',
          name: 'groups',
          target: 'groups',
          through: 'usersGroups',
        },
        {
          name: 'createdAt',
          type: 'date',
          interface: 'createdAt',
          field: 'createdAt',
          uiSchema: {
            type: 'datetime',
            title: '{{t("Created at")}}',
            'x-component': 'DatePicker',
            'x-component-props': {},
            'x-read-pretty': true,
          },
        },
      ],
    });

    const Post = app.db.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'belongsTo', name: 'user', target: 'users' },
      ],
    });

    const Group = app.db.collection({
      name: 'groups',
      fields: [{ type: 'string', name: 'name' }],
    });

    await app.db.sync();

    const [group1, group2, group3] = await Group.repository.create({
      values: [{ name: 'group1' }, { name: 'group2' }, { name: 'group3' }],
    });

    const values = Array.from({ length: 22 }).map((_, index) => {
      return {
        name: `user${index}`,
        age: index % 100,
        groups: [
          {
            id: group1.get('id'),
          },
          {
            id: group2.get('id'),
          },
          {
            id: group3.get('id'),
          },
        ],
        posts: Array.from({ length: 3 }).map((_, postIndex) => {
          return {
            title: `post${postIndex}`,
          };
        }),
      };
    });

    await User.repository.create({
      values,
    });

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        { dataIndex: ['age'], defaultTitle: 'Age' },
        { dataIndex: ['posts', 'title'], defaultTitle: 'Post Title' },
        { dataIndex: ['groups', 'name'], defaultTitle: 'Group Names' },
        { dataIndex: ['createdAt'], defaultTitle: 'Created at' },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      await new Promise((resolve, reject) => {
        XLSX.writeFileAsync(
          xlsxFilePath,
          wb,
          {
            type: 'array',
          },
          () => {
            resolve(123);
          },
        );
      });

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      expect(sheetData.length).toBe(23); // 22 users * 3 posts + 1 header

      const header = sheetData[0];
      expect(header).toEqual(['Name', 'Age', 'Post Title', 'Group Names', 'Created at']);

      const firstUser = sheetData[1];
      expect(firstUser).toEqual([
        'user0',
        0,
        'post0,post1,post2',
        'group1,group2,group3',
        moment().format('YYYY-MM-DD'),
      ]);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });

  it('should export data to xlsx', async () => {
    const User = app.db.collection({
      name: 'users',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'integer', name: 'age' },
      ],
    });

    await app.db.sync();

    const values = Array.from({ length: 22 }).map((_, index) => {
      return {
        name: `user${index}`,
        age: index % 100,
      };
    });

    await User.model.bulkCreate(values);

    const exporter = new XlsxExporter({
      collection: User,
      chunkSize: 10,
      columns: [
        { dataIndex: ['name'], defaultTitle: 'Name' },
        { dataIndex: ['age'], defaultTitle: 'Age' },
      ],
    });

    const wb = await exporter.run();

    const xlsxFilePath = path.resolve(__dirname, `t_${uid()}.xlsx`);
    try {
      await new Promise((resolve, reject) => {
        XLSX.writeFileAsync(
          xlsxFilePath,
          wb,
          {
            type: 'array',
          },
          () => {
            resolve(123);
          },
        );
      });

      // read xlsx file
      const workbook = XLSX.readFile(xlsxFilePath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      expect(sheetData.length).toBe(23); // 22 users + 1 header

      const header = sheetData[0];
      expect(header).toEqual(['Name', 'Age']);

      const firstUser = sheetData[1];
      expect(firstUser).toEqual(['user0', 0]);
    } finally {
      fs.unlinkSync(xlsxFilePath);
    }
  });
});
