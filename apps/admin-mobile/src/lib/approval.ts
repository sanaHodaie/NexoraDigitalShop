import { z } from 'zod';
import { digits } from './format';

const integer = (max: number, minimum: number) => z.string().transform(v => digits(v.trim()))
  .refine(v => /^\d+$/.test(v), 'فقط عدد صحیح وارد کنید')
  .transform(Number).refine(v => Number.isSafeInteger(v) && v >= minimum && v <= max, 'عدد خارج از محدوده است');
export const approvalSchema = z.object({
  lines: z.array(z.object({ name: z.string().trim().min(1, 'شرح قلم لازم است').max(300),
    quantity: integer(1_000_000, 1), unitPriceRial: integer(1_000_000_000_000, 1) })).min(1).max(50),
  shippingRial: integer(1_000_000_000_000, 0), terms: z.string().max(1000),
});
export type ApprovalForm = z.input<typeof approvalSchema>;
export type ApprovalData = z.output<typeof approvalSchema>;
export function totalRial(data: ApprovalData): bigint {
  return data.lines.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(line.unitPriceRial), BigInt(data.shippingRial));
}
