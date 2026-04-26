// Opcodes (single byte)
export const OP_NOP = 0x00;
export const OP_INDICATE = 0x0d;
export const OP_READ1 = 0x10;
export const OP_READ2 = 0x11;
export const OP_READ4 = 0x12;
export const OP_READFIFO = 0x18;
export const OP_WRITE1 = 0x20;
export const OP_WRITE2 = 0x21;
export const OP_WRITE4 = 0x22;
export const OP_WRITEFIFO = 0x28;

// Register addresses
export const REG_SWEEP_START_HZ = 0x00;
export const REG_SWEEP_STEP_HZ = 0x10;
export const REG_SWEEP_POINTS = 0x20;
export const REG_VALUES_PER_FREQ = 0x22;
export const REG_VALUES_FIFO = 0x30;
export const REG_DEVICE_VARIANT = 0xf0;
export const REG_PROTOCOL_VERSION = 0xf1;
export const REG_HARDWARE_REVISION = 0xf2;
export const REG_FIRMWARE_MAJOR = 0xf3;
export const REG_FIRMWARE_MINOR = 0xf4;

// Variant byte (read from REG_DEVICE_VARIANT) → max frequency in Hz.
// Per nanorfe.com V2 manual.
export const VARIANT_MAX_HZ: Readonly<Record<number, number>> = Object.freeze({
  2: 3_000_000_000,
  3: 4_000_000_000,
  4: 4_400_000_000,
});

// Each FIFO record is 32 bytes.
export const FIFO_RECORD_BYTES = 32;

export const V2_MIN_HZ = 50_000;
export const V2_MAX_POINTS = 1024;

export type VariantByte = 0x02 | 0x03 | 0x04;

export function isKnownVariant(b: number): b is VariantByte {
  return b === 0x02 || b === 0x03 || b === 0x04;
}
