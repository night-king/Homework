$(function () {
    var l = abp.localization.getResource('Homework');
    var editModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/Children/EditModal');
    var pinModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/Children/SetPinModal');

    var dt = $('#ChildrenTable').DataTable(abp.libs.datatables.normalizeConfiguration({
        serverSide: false, paging: false, searching: false, info: false,
        ajax: abp.libs.datatables.createAjax(homework.children.childProfile.getList),
        columnDefs: [
            { title: l('Actions'), rowAction: { items: [
                { text: l('Edit'), action: function (data) { editModal.open({ id: data.record.id }); } },
                { text: l('SetPin'), action: function (data) { pinModal.open({ id: data.record.id }); } }
            ] } },
            { title: l('DisplayName'), data: 'displayName' },
            { title: l('Grade'), data: 'grade' },
            { title: l('HasPin'), data: 'hasPin' }
        ]
    }));
    editModal.onResult(function () { dt.ajax.reload(); });
    pinModal.onResult(function () { dt.ajax.reload(); });
});
