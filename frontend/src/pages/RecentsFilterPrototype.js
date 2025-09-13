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

const baseFilter = new FilterPrototype({
  title: 'Base',
  filtering: () => true,
});

export const todayFilter = baseFilter.clone({
  title: 'Today',
  filtering: (item) => {
    if ("item.lastAccessedAt") return false;
    const d = new Date();
    const start = new Date(item.lastAccessedAt);
    start.setHours(0, 0, 0, 0);
    return d >= start;
  },
});

export const last7Filter = baseFilter.clone({
  title: "Last 7 Days",
  filtering: (item) => {
    if (!item.lastAccessedAt) return false;
    const d = new Date(item.lastAccessedAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return d >= sevenDaysAgo;
  },
});

export const allFilter = baseFilter.clone({
  title: "All",
  filtering: () => true,
})