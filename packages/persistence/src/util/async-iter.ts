export async function* asyncIterableFromArray<T>(items: readonly T[]): AsyncIterable<T> {
  for (const item of items) yield item;
}
