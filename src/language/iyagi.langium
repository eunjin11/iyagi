grammar Iyagi

// ---------------------------------------------------------------------------
// Terminals
// ---------------------------------------------------------------------------

terminal NL: /(\r?\n)/;
terminal COMMENT: /\/\/[^\r\n]*/;

hidden terminal WS: / +/; // spaces only (tabs are not skipped)

terminal SIGNED_NUMBER: /-?\d+(\.\d+)?/;
terminal ID: /[a-zA-Z_][a-zA-Z0-9_]*/;

terminal STRING: /"([^"\\]|\\.)*"/;

terminal LE: /<=/;
terminal GE: />=/;
terminal LT: /</;
terminal GT: />/;


// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

entry Document:
  IgnoredTop*
  ('title:' title=STRING NL IgnoredTop*)?
  VarsBlock?
  scenes+=Scene*;

IgnoredTop returns string:
    NL
  | COMMENT NL;

VarsBlock:
  'vars:' NL
  vars+=VarLine*
  IgnoredTop*;

VarLine:
  name=ID '=' value=VarValue NL;

VarValue returns string:
    SIGNED_NUMBER
  | 'true'
  | 'false'
  | STRING;

Scene:
    MultiLineScene
  | InlineScene;

MultiLineScene:
  name=ID '{' NL
    (items+=SceneItem | IgnoredLine)*
  '}' IgnoredTop*;

InlineScene:
  name=ID '{' texts+=STRING+ '}' IgnoredTop*;

SceneItem:
    ChoiceBlock
  | IfBlock
  | TextLine
  | ScriptLine;

IfBlock:
  'if' '(' cond=WhenExpr ')' '{' NL
  thenItems+=ActionLine*
  '}'
  ('else' '{' NL
  elseItems+=ActionLine*
  '}')?
  NL?;

IgnoredLine returns string:
    NL
  | COMMENT NL;

TextLine:
  texts+=STRING+ NL;

ScriptLine:
  head=ScriptHead tailTokens+=ScriptToken* NL;

ScriptHead returns string:
    ID
  | SIGNED_NUMBER
  | 'true'
  | 'false'
  | 'if'
  | LE
  | GE
  | LT
  | GT
  | '='
  | '('
  | ')'
  | ','
  | '.';

ScriptToken returns string:
    ID
  | STRING
  | SIGNED_NUMBER
  | 'true'
  | 'false'
  | 'if'
  | LE
  | GE
  | LT
  | GT
  | '='
  | '('
  | ')'
  | ','
  | '.';

ChoiceBlock:
  'choices:' NL?
  '{' NL?
  choices+=ChoiceLine*
  '}' NL?;

ChoiceLine:
  (IfChoice | PlainChoice);

IfChoice:
  'if' '(' cond=WhenExpr ')' text=STRING '->' action=ChoiceAction NL?;

PlainChoice:
  text=STRING '->' action=ChoiceAction NL?;

WhenExpr:
  condTokens+=WhenToken+;

WhenToken returns string:
    ID
  | STRING
  | SIGNED_NUMBER
  | 'true'
  | 'false'
  | LE
  | GE
  | LT
  | GT
  | '='
  | '('
  | ','
  | '.';

ChoiceAction:
    InlineAction
  | BlockAction;

InlineAction:
  '{' codeTokens+=ScriptToken* '}';

BlockAction:
  NL?
  '{' NL
  lines+=ActionLine*
  '}';

ActionLine:
    ActionTextLine
  | ActionScriptLine;

ActionTextLine:
  texts+=STRING+ NL;

ActionScriptLine:
  head=ScriptHead tailTokens+=ScriptToken* NL;
