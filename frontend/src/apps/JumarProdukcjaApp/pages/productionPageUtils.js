export const sortProductionRolls = (items) => {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftNumber = Number(left?.Rolka);
    const rightNumber = Number(right?.Rolka);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    if (Number.isFinite(leftNumber)) {
      return -1;
    }
    if (Number.isFinite(rightNumber)) {
      return 1;
    }

    return String(left?.Rolka || '').localeCompare(String(right?.Rolka || ''), 'pl');
  });
};

const getPriorityRank = (order) => {
  const rawPriority = order?.Priorytet;
  if (rawPriority === null || rawPriority === undefined || rawPriority === '') {
    return 99;
  }
  const priority = Number(rawPriority);
  if (Number.isFinite(priority)) {
    return priority;
  }
  return 99;
};

export const sortProductionOrders = (items) => {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const priorityDiff = getPriorityRank(left) - getPriorityRank(right);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return String(left?.NrZp || '').localeCompare(String(right?.NrZp || ''), 'pl');
  });
};

export const getPriorityClassName = (order) => {
  const rawPriority = order?.Priorytet;
  if (rawPriority === null || rawPriority === undefined || rawPriority === '') {
    return 'is-low-priority';
  }
  const priority = Number(rawPriority);
  if (priority === 0) {
    return 'is-high-priority';
  }
  if (priority === 1) {
    return 'is-medium-priority';
  }
  return 'is-low-priority';
};
