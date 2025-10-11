# Cast Tab Mobile Redesign - Visual Changes Guide

## Before vs After Comparison

### Mobile View (375px - iPhone SE)

#### BEFORE (Issues):
```
┌─────────────────────────────────────┐
│ Settings                      [×]   │
│ [General][Cast][Gameplay]...       │
├─────────────────────────────────────┤
│ Cast Editor                         │
│                                     │
│ [👤][👤][👤][👤][👤]→→→ (cut off) │
│                                     │
│ ┌─────────┐  Name: [________]       │
│ │         │  Age:  [__] Sex: [...] │ ← Overflow!
│ │ Avatar  │  Occupation: [_______...│
│ │ 140x140 │  Motto: [____________...│
│ └─────────┘                         │
└─────────────────────────────────────┘
```

#### AFTER (Fixed):
```
┌─────────────────────────────────────┐
│ Settings                      [×]   │
│ [General][Cast][Gameplay]...       │
├─────────────────────────────────────┤
│ Cast Editor               1/8       │
│                                     │
│ ⟨👤⟩[👤][👤][👤][👤]→ (scrollable) │
│    └─ Active (outlined)             │
│                                     │
│      ┌─────────┐                    │
│      │ Avatar  │                    │
│      │ 100x100 │ (centered)         │
│      └─────────┘                    │
│                                     │
│ Name                                │
│ [________________________]          │
│ Age                                 │
│ [80px___]                           │
│ Sex                                 │
│ [________________________]          │
│ Occupation                          │
│ [________________________]          │
│ Motto                               │
│ [________________________]          │
│                                     │
└─────────────────────────────────────┘
```

### Tablet View (768px - iPad)

```
┌────────────────────────────────────────────────────────────┐
│ Settings                                             [×]   │
│ [General][Cast][Gameplay][Timing][Visual]...              │
├────────────────────────────────────────────────────────────┤
│ Cast Editor                                          3/8   │
│                                                            │
│ ⟨👤⟩[👤][👤][👤][👤][👤][👤]→ (horizontal scroll)        │
│                                                            │
│  ┌─────────┐       Name              Sex                  │
│  │         │       [__________]      [_______]            │
│  │ Avatar  │       Age               Occupation           │
│  │ 140x140 │       [____]            [________________]   │
│  │         │       Motto                                  │
│  └─────────┘       [____________________________]         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Desktop View (>1100px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Settings                                                       [×]   │
│ [General][Cast][Gameplay][Timing][Visual][Audio][Advanced][Debug]   │
├──────────────────────────────────────────────────────────────────────┤
│ Cast Editor                                                    5/8   │
│                                                                      │
│ [👤][👤]⟨👤⟩[👤][👤][👤][👤][👤] (all visible, center active)      │
│                                                                      │
│  ┌─────────┐    Name          Age           Sex                     │
│  │         │    [________]    [____]         [________]             │
│  │ Avatar  │    Occupation                                          │
│  │ 140x140 │    [_____________________________]                     │
│  │         │    Motto                                               │
│  └─────────┘    [_____________________________]                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Visual Changes

### 1. Roster Strip
- **Before**: Simple horizontal layout, could overflow
- **After**: Scrollable with snap points, active chip outlined

### 2. Avatar Preview
- **Before**: Fixed 140×140px (too large on mobile)
- **After**: Responsive (100px mobile, 140px desktop)

### 3. Form Layout
- **Before**: Fixed 3-column grid, caused overflow
- **After**: Responsive (1 column mobile, 2 column tablet, 3 column desktop)

### 4. Touch Targets
- **Before**: Variable heights, some < 40px
- **After**: All inputs min-height: 40px

### 5. Labels
- **Before**: Horizontal layout (label | input)
- **After**: Vertical on mobile (label above input)

## CSS Breakpoints

### Mobile First (<540px)
```css
- Single column form layout
- 100px avatar preview
- 14px input font size
- 8px card padding
- Tight gaps (6px)
```

### Tablet (541px - 900px)
```css
- Single column form layout
- 140px avatar preview
- Standard input sizing
- 10px card padding
```

### Wide Tablet (901px - 1100px)
```css
- Two column form layout
- 140px avatar preview
- Age/Sex side by side
- Full fields span both columns
```

### Desktop (>1100px)
```css
- Three column form layout
- 140px avatar preview
- Avatar and form side-by-side
- Original design preserved
```

## Accessibility Highlights

### Visual Indicators
- Active roster chip: 2px solid #2d8ab4 outline with 1px offset
- Focus visible on all interactive elements
- Sufficient color contrast (WCAG AA)

### Screen Reader Improvements
- Progress indicator: "5 of 8" (announced on change)
- Roster: "Cast roster list with 8 items"
- Avatar button: "Upload avatar photo"
- Form: "Cast member details form"

### Keyboard Navigation
- Arrow keys navigate roster horizontally
- Enter/Space activates selection
- Tab navigates form fields
- Escape closes modal

## Touch Improvements
- All buttons/inputs ≥ 40×40px
- Touch-action: manipulation (prevents delays)
- Smooth scroll with momentum (iOS)
- Snap points on roster for precise selection

## Performance
- Single CSS injection (no flash of unstyled content)
- No layout shifts during load
- Smooth 60fps scrolling
- Efficient DOM updates
