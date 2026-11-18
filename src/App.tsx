/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminPortal } from './components/AdminPortal';
import { HousePortal } from './components/HousePortal';
import { LoginGate } from './components/LoginGate';
import { useSportsStore } from './hooks/useSportsStore';
import { computeHouseStandings } from './utils/sportsLogic';

export default function App() {
  const {
    state,
    session,
    syncStatus,
    connectCloudSync,
    disconnectCloudSync,
    syncNow,
    loginAdmin,
    loginHouse,
    logout,
    resetDemoData,
    updateAgeConfig,
    upsertGame,
    deleteGame,
    assignGamePlayer,
    toggleGamePlayerRole,
    removeGamePlayer,
    importStudents,
    runAutoDistribute,
    upsertTeacher,
    removeTeacher,
    assignStudentsHouse,
    upsertStudent,
    deleteStudent,
    updateHouseCredential,
    updateTeamCardEntryAudit,
    finalizeTeamCardReview,
    addTeamCardEntry,
    removeTeamCardEntry,
    submitTeamCardForReview,
    addScoreEntry,
    deleteScoreEntry,
    upsertSchedule,
    deleteSchedule,
  } = useSportsStore();

  const standings = computeHouseStandings(state.scores);

  if (!session) {
    return (
      <LoginGate
        meetName={state.meetName}
        houseCredentials={state.houseCredentials}
        standings={standings}
        syncStatus={syncStatus}
        onConnectCloud={connectCloudSync}
        onDisconnectCloud={disconnectCloudSync}
        onSyncNow={syncNow}
        onLoginAdmin={loginAdmin}
        onLoginHouse={loginHouse}
      />
    );
  }

  if (session.role === 'admin') {
    return (
      <AdminPortal
        state={state}
        syncStatus={syncStatus}
        onConnectCloud={connectCloudSync}
        onDisconnectCloud={disconnectCloudSync}
        onSyncNow={syncNow}
        onLogout={logout}
        onResetDemoData={resetDemoData}
        onUpdateAgeConfig={updateAgeConfig}
        onUpsertGame={upsertGame}
        onDeleteGame={deleteGame}
        onAssignGamePlayer={assignGamePlayer}
        onTogglePlayerRole={toggleGamePlayerRole}
        onRemoveGamePlayer={removeGamePlayer}
        onImportStudents={importStudents}
        onAutoDistribute={runAutoDistribute}
        onUpsertTeacher={upsertTeacher}
        onRemoveTeacher={removeTeacher}
        onAssignStudentsHouse={assignStudentsHouse}
        onUpsertStudent={upsertStudent}
        onDeleteStudent={deleteStudent}
        onUpdateHouseCredential={updateHouseCredential}
        onUpdateTeamCardEntryAudit={updateTeamCardEntryAudit}
        onFinalizeTeamCardReview={finalizeTeamCardReview}
        onAddScore={addScoreEntry}
        onDeleteScore={deleteScoreEntry}
        onUpsertSchedule={upsertSchedule}
        onDeleteSchedule={deleteSchedule}
      />
    );
  }

  return (
    <HousePortal
      house={session.house}
      state={state}
      syncStatus={syncStatus}
      onConnectCloud={connectCloudSync}
      onDisconnectCloud={disconnectCloudSync}
      onSyncNow={syncNow}
      onLogout={logout}
      onAddTeamCardEntry={addTeamCardEntry}
      onRemoveTeamCardEntry={removeTeamCardEntry}
      onSubmitTeamCard={submitTeamCardForReview}
    />
  );
}
