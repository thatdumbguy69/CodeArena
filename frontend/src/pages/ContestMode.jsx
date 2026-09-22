import React from 'react';
import { StudentProblemWorkspace } from './student/StudentProblemWorkspace';

export const ContestMode = ({ contest, onFinishContest, onBack }) => {
  return (
    <StudentProblemWorkspace
      problemSlug="contest-lobby"
      contestMode={true}
      contest={contest}
      onBack={onBack || onFinishContest}
      onViewLeaderboard={onFinishContest || onBack}
    />
  );
};

export default ContestMode;
