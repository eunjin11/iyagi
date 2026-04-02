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
  IND2 name=ID '=' value=VarValue NL;

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
  | TextLine
  | ScriptLine;

IgnoredLine returns string:
    NL
  | COMMENT NL;

TextLine:
  IND2 texts+=STRING+ NL;

ScriptLine:
  IND2 head=ScriptHead tailTokens+=ScriptToken* NL;

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
  IND2 'choices:' NL
  choices+=ChoiceLine*;

ChoiceLine:
  IND4 (IfChoice | PlainChoice);

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
  | BlockActionSameLine
  | BlockActionNextLine;

InlineAction:
  '{' codeTokens+=ScriptToken* '}';

BlockActionSameLine:
  '{' NL
  block=ActionBlockSameLine;

BlockActionNextLine:
  NL
  IND6 '{' NL
  block=ActionBlockNextLine;

ActionBlockSameLine:
  lines+=ActionLine6*
  IND4 '}' NL?;

ActionLine6:
  IND6 codeTokens+=ScriptToken+ NL;

ActionBlockNextLine:
  lines+=ActionLine8*
  IND6 '}' NL?;

ActionLine8:
  IND8 codeTokens+=ScriptToken+ NL;


