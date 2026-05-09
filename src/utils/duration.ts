const durationPattern = /^(\d+)([smhd])$/;

const unitToMs: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

export const durationToMs = (value: string) => {
  const match = durationPattern.exec(value);

  if (!match) {
    throw new Error(`Unsupported duration value: ${value}`);
  }

  const [, amount, unit] = match;
  return Number(amount) * unitToMs[unit];
};
