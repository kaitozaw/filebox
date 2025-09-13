export class FilterPrototype {
  constructor( { title, filtering }) {
    this.title = title;
    this.filtering = filtering;
    Object.freeze(this);
  }

  clone(overrides = {}) {
    return new FilterPrototype({ ...this, ...overrides });
  }
}

