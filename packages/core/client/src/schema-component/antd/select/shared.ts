import { castArray } from 'lodash';

export const defaultFieldNames = {
  label: 'label',
  value: 'value',
  color: 'color',
  options: 'children',
};

export const getCurrentOptions = (item, dataSource, fieldNames) => {
  function flatData(data) {
    let newArr = [];
    for (let i = 0; i < data.length; i++) {
      const children = data[i][fieldNames.options];
      if (Array.isArray(children)) {
        newArr.push(...flatData(children));
      }
      newArr.push({ ...data[i] });
    }
    return newArr;
  }
  const result = flatData(dataSource);
  const values = castArray(item)
    .filter((item) => item != null)
    .map((val) => (typeof val === 'object' ? val[fieldNames.value] : val));
  const findOptions = (options: any[]) => {
    if (!options) return [];
    let current = [];
    for (const value of values) {
      const option = options.find((v) => v[fieldNames.value] === value) || item;
      current.push(option);
    }
    return current;
  };
  return findOptions(result);
};
