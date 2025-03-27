/**
 * Calculate quantile value from a sorted array
 */
export function calculateQuantile(sortedArray: number[], q: number): number {
  if (sortedArray.length === 0) return 0;

  const pos = (sortedArray.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sortedArray[base + 1] !== undefined) {
    return sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base]);
  } else {
    return sortedArray[base];
  }
}

/**
 * Calculate box plot statistics (5%, 25%, 50%, 75%, 95% quartiles)
 */
export function calculateBoxplotStats(data: number[]): {
  q05: number;
  q25: number;
  median: number;
  q75: number;
  q95: number;
  min: number;
  max: number;
  mean: number;
  count: number;
} {
  if (data.length === 0) {
    return {
      q05: 0,
      q25: 0,
      median: 0,
      q75: 0,
      q95: 0,
      min: 0,
      max: 0,
      mean: 0,
      count: 0,
    };
  }

  // Sort the data
  const sorted = [...data].sort((a, b) => a - b);

  // Calculate mean
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;

  return {
    q05: calculateQuantile(sorted, 0.05),
    q25: calculateQuantile(sorted, 0.25),
    median: calculateQuantile(sorted, 0.5),
    q75: calculateQuantile(sorted, 0.75),
    q95: calculateQuantile(sorted, 0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    count: sorted.length,
  };
}
