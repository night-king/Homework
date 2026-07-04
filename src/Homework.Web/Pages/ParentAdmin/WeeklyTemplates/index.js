$(function () {
    var l = abp.localization.getResource('Homework');
    var days = [l('Day0'), l('Day1'), l('Day2'), l('Day3'), l('Day4'), l('Day5'), l('Day6')]; // Sun..Sat
    var createModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/WeeklyTemplates/CreateModal');
    var editModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/WeeklyTemplates/EditModal');
    var selectedChildId = null;

    var dt = $('#TemplatesTable').DataTable(abp.libs.datatables.normalizeConfiguration({
        serverSide: false, paging: false, searching: false, info: false,
        ajax: abp.libs.datatables.createAjax(
            homework.tasks.weeklyTaskTemplate.getList,
            function () { return { childId: selectedChildId }; }),
        columnDefs: [
            { title: l('Actions'), rowAction: { items: [
                { text: l('Edit'), action: function (d) { editModal.open({ id: d.record.id, title: d.record.title, subject: d.record.subject, order: d.record.order, estimatedMinutes: d.record.estimatedMinutes, isActive: d.record.isActive }); } },
                { text: l('Delete'), confirmMessage: function () { return l('DeleteConfirm'); },
                  action: function (d) { homework.tasks.weeklyTaskTemplate.delete(d.record.id).then(function () { dt.ajax.reload(); }); } }
            ] } },
            { title: l('DayOfWeek'), data: 'dayOfWeek', render: function (v) { return days[v]; } },
            { title: l('Title'), data: 'title' },
            { title: l('Subject'), data: 'subject' },
            { title: l('Order'), data: 'order' },
            { title: l('IsActive'), data: 'isActive' }
        ]
    }));

    function reload() { if (selectedChildId) { dt.ajax.reload(); } }

    homework.children.childProfile.getList().then(function (res) {
        var $sel = $('#ChildSelect');
        res.items.forEach(function (c) { $sel.append($('<option>').val(c.id).text(c.displayName)); });
        if (res.items.length) { selectedChildId = res.items[0].id; reload(); }
    });
    $('#ChildSelect').on('change', function () { selectedChildId = $(this).val(); reload(); });
    $('#NewItemButton').on('click', function () { if (selectedChildId) { createModal.open({ childId: selectedChildId }); } });
    createModal.onResult(function () { reload(); });
    editModal.onResult(function () { reload(); });
});
