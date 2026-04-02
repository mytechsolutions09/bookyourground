# Memory

- **React Native Web dropdowns / overlays above sibling form fields**
  - Putting a high `zIndex` only **inside** the dropdown component is often **not enough**.
  - If the dropdown sits in a **column** and the fields below are **separate flex children**, those later siblings are painted **on top** of the first row’s overflow (including an absolutely positioned menu).
  - **Fix:** give the **wrapper `View` around the trigger + menu** (the whole “row” that owns the dropdown) `position: 'relative'`, `zIndex` higher than the following block (e.g. `20`), and `overflow: 'visible'`. Optionally wrap the fields **below** in a sibling with `zIndex: 0` so stacking is explicit.
  - Card-level `zIndex` can still help the whole section sit above **later** cards (e.g. Images), but it does not fix overlap **within** the same card between stacked flex rows.
  - In a **horizontal** flex row (e.g. form **left** + preview **right**), the **second column** often paints **on top** of the first. Give the **left** column `position: 'relative'` + higher `zIndex` than the right so open menus in the form are not covered by the preview card.
