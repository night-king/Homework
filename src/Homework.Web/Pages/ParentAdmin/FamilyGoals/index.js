$(function () {
    var l = abp.localization.getResource('Homework');
    var createModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/FamilyGoals/CreateModal');
    var editModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/FamilyGoals/EditModal');

    var dt = $('#GoalsTable').DataTable(abp.libs.datatables.normalizeConfiguration({
        serverSide: false, paging: false, searching: false, info: false,
        ajax: abp.libs.datatables.createAjax(homework.scoring.familyGoal.getList),
        columnDefs: [
            { title: l('Actions'), rowAction: { items: [
                { text: l('Edit'), action: function (d) { editModal.open({ id: d.record.id }); } },
                { text: l('Delete'), confirmMessage: function () { return l('DeleteConfirm'); },
                  action: function (d) { homework.scoring.familyGoal.delete(d.record.id).then(function () { dt.ajax.reload(); }); } }
            ] } },
            { title: l('Title'), data: 'title' },
            { title: l('TargetStars'), data: 'targetStars' },
            { title: l('CurrentStars'), data: 'currentStars' },
            { title: l('Progress'), data: 'progressPercent', render: function (v) {
                return '<div class="progress" style="min-width:110px"><div class="progress-bar" role="progressbar" style="width:' + v + '%">' + v + '%</div></div>';
            } },
            { title: l('Achieved'), data: 'isAchieved', render: function (v) {
                return v ? '<span class="badge bg-success">' + l('Achieved') + '</span>' : '';
            } },
            { title: l('RewardText'), data: 'rewardText' }
        ]
    }));
    $('#NewGoalButton').on('click', function () { createModal.open(); });
    createModal.onResult(function () { dt.ajax.reload(); });
    editModal.onResult(function () { dt.ajax.reload(); });
});
