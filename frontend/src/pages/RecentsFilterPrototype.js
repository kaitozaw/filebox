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

const isTodayLocal = (d) =>
  new Date(d).toDateString() === new Date().toDateString();

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const baseFilter = new FilterPrototype({
  title: 'Base',
  filtering: () => true,
});

export const todayFilter = baseFilter.clone({
   title: 'Today', filtering: (item) => item?.lastAccessedAt && isTodayLocal(item.lastAccessedAt),
  });

export const last7Filter = baseFilter.clone({
  title: "Last 7 Days",
  filtering: (item) => item?.lastAccessedAt && new Date(item.lastAccessedAt) >= daysAgo(7),
});

export const allFilter = baseFilter.clone({
  title: "All",
  filtering: () => true,
})