alter type public."SaleStatus" add value if not exists 'REFUND_REQUESTED';
alter type public."SaleStatus" add value if not exists 'REFUND_PENDING';
alter type public."SaleStatus" add value if not exists 'REFUND_REJECTED';
