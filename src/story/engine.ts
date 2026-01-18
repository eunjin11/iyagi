import { useEffect, useMemo, useState } from 'react';
import type { Choice, Story, VariableBag, ChoiceCondition, ChoiceEffect } from './types';

function checkCondition(vars: VariableBag, cond: ChoiceCondition): boolean {
  const v = vars[cond.key];
  switch (cond.op) {
    case 'truthy':
      return Boolean(v);
    case 'falsy':
      return !Boolean(v);
    case 'eq':
      return v === cond.value;
    case 'neq':
      return v !== cond.value;
    case 'gt':
      return Number(v) > Number(cond.value);
    case 'gte':
      return Number(v) >= Number(cond.value);
    case 'lt':
      return Number(v) < Number(cond.value);
    case 'lte':
      return Number(v) <= Number(cond.value);
    default:
      return false;
  }
}

function applyEffect(vars: VariableBag, eff: ChoiceEffect): VariableBag {
  const next = { ...vars };
  if (eff.type === 'set') {
    next[eff.key] = eff.value;
  } else if (eff.type === 'inc') {
    next[eff.key] = (Number(next[eff.key]) || 0) + eff.by;
  } else if (eff.type === 'dec') {
    next[eff.key] = (Number(next[eff.key]) || 0) - eff.by;
  }
  return next;
}

function isChoiceVisible(choice: Choice, vars: VariableBag): boolean {
  // ifAny: show if any group fully matches
  if (choice.ifAny && choice.ifAny.length > 0) {
    const anyOk = choice.ifAny.some((group) => group.every((c) => checkCondition(vars, c)));
    // If both if and ifAny are present, require both
    if (choice.if && choice.if.length > 0) {
      return anyOk && choice.if.every((c) => checkCondition(vars, c));
    }
    return anyOk;
  }
  if (!choice.if || choice.if.length === 0) return true;
  return choice.if.every((c) => checkCondition(vars, c));
}

export function useStoryEngine(story: Story) {
  const [currentId, setCurrentId] = useState<string>(story.start);
  const [vars, setVars] = useState<VariableBag>(story.init ?? {});

  const passage = useMemo(() => story.passages[currentId], [story, currentId]);
  const visibleChoices = useMemo(
    () => passage.choices.filter((c) => isChoiceVisible(c, vars)),
    [passage, vars]
  );

  // Apply passage-enter effects whenever we navigate to a passage
  useEffect(() => {
    if (!passage?.enter || passage.enter.length === 0) return;
    setVars((prev) => {
      let next = prev;
      for (const eff of passage.enter!) {
        next = applyEffect(next, eff);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  function choose(choice: Choice) {
    let nextVars = vars;
    if (choice.do) {
      for (const eff of choice.do) {
        nextVars = applyEffect(nextVars, eff);
      }
    }
    setVars(nextVars);
    setCurrentId(choice.goto);
  }

  function restart() {
    setCurrentId(story.start);
    setVars(story.init ?? {});
  }

  return {
    story,
    passage,
    choices: visibleChoices,
    vars,
    choose,
    restart
  };
}


