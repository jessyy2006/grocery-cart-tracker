# Even padding around the receipt quote

## What's happening

On both receipts the quote block sits at the very bottom of the paper body, so its
spacing is asymmetric:

```text
divider  (my-2  = 8px)
   +  quote wrapper margin-top (my-5 = 20px)   -> 28px above
quote
   +  quote wrapper margin-bottom (my-5 = 20px)
   +  paper body padding-bottom  (py-5 = 20px) -> 40px below
perforation
```

The 40px below vs 28px above is the "giant gap".

## Fix

In both `src/components/finance/ReceiptView.tsx` (quote block, ~line 456) and
`src/components/finance/YearlyReceiptView.tsx` (~line 297), change the quote
wrapper from `my-5` to `mt-3 mb-0`. The body's existing `py-5` then supplies the
20px below, and 8px divider + 12px top margin gives 20px above — even padding,
no other layout touched.

No changes to the paper padding, divider, perforation, or the PNG export path
(the quote block renders identically in the exported image).
