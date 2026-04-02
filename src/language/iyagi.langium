grammar Iyagi

// ---------------------------------------------------------------------------
// Terminals
// ---------------------------------------------------------------------------

terminal NL: /(\r?\n)/;
terminal COMMENT: /\/\/[^\r\n]*/;

terminal IND8: /        /;
terminal IND6: /      /;
terminal IND4: /    /;
terminal IND2: /  /;

terminal BLANK: / +/; // spaces only (tabs forbidden by design)

terminal SIGNED_NUMBER: /-?\d+(\.\d+)?/;
terminal ID: /[a-zA-Z_][a-zA-Z0-9_]*/;

terminal STRING: /"([^"\\]|\\.)*"/;

// For script/action lines: keep everything until newline.
terminal LINE_TEXT: /[^\r\n]+/;

// For inline `{ ... }` action: keep everything until the first `}` on the same line.
terminal INLINE_ACTION_TEXT: /[^}\r\n]+/;

// For `if (<expr>)` capture: everything until `)` (no nesting).
terminal WHEN_TEXT: /[^)\r\n]+/;

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

entry Document:
  VarsBlock? scenes+=Scene*;

VarsBlock:
  'vars:' NL
  vars+=VarLine*;

VarLine:
  IND2 name=ID BLANK? '=' BLANK? value=VarValue BLANK? NL;

VarValue returns string:
    SIGNED_NUMBER
  | 'true'
  | 'false'
  | STRING;

Scene:
  name=ID BLANK? '{' BLANK? NL
    (items+=SceneItem | IgnoredLine)*
  '}' BLANK? NL?;

SceneItem:
    ChoiceBlock
  | TextLine
  | ScriptLine;

IgnoredLine returns string:
    BLANK? NL
  | BLANK? COMMENT BLANK? NL;

TextLine:
  IND2 texts+=STRING+ BLANK? NL;

ScriptLine:
  IND2 code=LINE_TEXT NL;

ChoiceBlock:
  IND2 'choices:' BLANK? NL
  choices+=ChoiceLine*;

ChoiceLine:
    IND4 IfChoice
  | IND4 PlainChoice;

IfChoice:
  'if' BLANK? '(' cond=WhenExpr ')' BLANK text=STRING BLANK? '->' BLANK? action=ChoiceAction BLANK? NL?;

PlainChoice:
  text=STRING BLANK? '->' BLANK? action=ChoiceAction BLANK? NL?;

WhenExpr:
  cond=WHEN_TEXT;

ChoiceAction:
    InlineAction
  | BlockActionSameLine
  | BlockActionNextLine;

InlineAction:
  '{' BLANK? code=INLINE_ACTION_TEXT BLANK? '}';

BlockActionSameLine:
  '{' BLANK? NL
  block=ActionBlock;

BlockActionNextLine:
  NL
  IND6 '{' BLANK? NL
  block=ActionBlock;

ActionBlock:
  lines+=ActionLine*
  IND6 '}' BLANK? NL?;

ActionLine:
  IND8 code=LINE_TEXT NL;

