/**
 * DotDensityMap uses a square-root scale with domain [0, 1] and a 0.25px
 * minimum. Invert that scale to preserve area ratios, including tiny amounts.
 * The reference amount renders with exactly the supplied reference radius.
 */
export function bubbleRadiusInput(
  amount: number,
  referenceAmount: number,
  referenceRadius: number,
): number {
  const radius = referenceRadius * Math.sqrt(amount / referenceAmount);
  const position = (radius - 0.25) / (referenceRadius - 0.25);
  return Math.sign(position) * position ** 2;
}
