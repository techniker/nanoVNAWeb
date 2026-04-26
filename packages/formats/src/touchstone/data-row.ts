function fmt(n: number): string {
  return n.toFixed(6);
}

export function emitDataRow1Port(freq: number, s11: { mag: number; angDeg: number }): string {
  return `${freq}  ${fmt(s11.mag)}  ${fmt(s11.angDeg)}`;
}

export function emitDataRow2Port(
  freq: number,
  s11: { mag: number; angDeg: number },
  s21: { mag: number; angDeg: number },
): string {
  // Touchstone 1.0 2-port column order: S11, S21, S12, S22.
  // S12 and S22 are zero-filled because NanoVNA hardware doesn't measure them.
  return (
    `${freq}  ${fmt(s11.mag)}  ${fmt(s11.angDeg)}` +
    `  ${fmt(s21.mag)}  ${fmt(s21.angDeg)}` +
    `  ${fmt(0)}  ${fmt(0)}` +
    `  ${fmt(0)}  ${fmt(0)}`
  );
}
