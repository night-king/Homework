$(function () {
    var l = abp.localization.getResource('Homework');
    var createModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/DailyTasks/CreateModal');
    var editModal = new abp.ModalManager(abp.appPath + 'ParentAdmin/DailyTasks/EditModal');
    var childId = null;

    var now = new Date();
    $('#BoardDate').val(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));

    function esc(s) { return $('<div>').text(s == null ? '' : s).html(); }

    function render(board) {
        var summary = '<span class="badge bg-warning text-dark me-2">★ ' + board.stars + '</span>' +
            '<span class="me-3">' + l('Completed') + ': ' + board.tasksCompleted + '/' + board.tasksTotal + '</span>';
        if (board.isFull) summary += '<span class="badge bg-success">' + l('IsFull') + '</span>';
        else if (board.isRestDay) summary += '<span class="badge bg-secondary">' + l('RestDay') + '</span>';
        $('#SummaryCard').html(summary);

        var $tb = $('#TasksTable tbody').empty();
        board.tasks.forEach(function (t) {
            var actions = '';
            if (t.reviewState === 1) actions += '<button class="btn btn-sm btn-outline-secondary act-restore" data-id="' + t.id + '">' + l('Restore') + '</button> ';
            else if (t.isCompleted) actions += '<button class="btn btn-sm btn-outline-warning act-revoke" data-id="' + t.id + '">' + l('Revoke') + '</button> ';
            actions += '<button class="btn btn-sm btn-outline-primary act-edit" data-id="' + t.id + '" data-title="' + esc(t.title) + '" data-subject="' + esc(t.subject) + '" data-order="' + t.order + '">' + l('Edit') + '</button> ';
            actions += '<button class="btn btn-sm btn-outline-danger act-del" data-id="' + t.id + '">' + l('Delete') + '</button>';
            var state = t.reviewState === 1 ? l('Revoked') : l('Normal');
            $tb.append('<tr><td>' + t.order + '</td><td>' + esc(t.title) + '</td><td>' + esc(t.subject) + '</td><td>' +
                (t.countsAsCompleted ? '✔' : '') + '</td><td>' + state + '</td><td>' + actions + '</td></tr>');
        });
    }

    function reload() { if (childId) { homework.tasks.dailyTask.getBoard({ childId: childId, date: $('#BoardDate').val() }).then(render); } }

    homework.children.childProfile.getList().then(function (res) {
        var $sel = $('#ChildSelect');
        res.items.forEach(function (c) { $sel.append($('<option>').val(c.id).text(c.displayName)); });
        if (res.items.length) { childId = res.items[0].id; reload(); }
    });
    $('#ChildSelect').on('change', function () { childId = $(this).val(); reload(); });
    $('#BoardDate').on('change', reload);
    $('#NewTaskButton').on('click', function () { if (childId) { createModal.open({ childId: childId, date: $('#BoardDate').val() }); } });
    $('#TasksTable').on('click', '.act-revoke', function () { homework.tasks.dailyTask.revoke($(this).data('id')).then(reload); });
    $('#TasksTable').on('click', '.act-restore', function () { homework.tasks.dailyTask.restore($(this).data('id')).then(reload); });
    $('#TasksTable').on('click', '.act-del', function () { homework.tasks.dailyTask.delete($(this).data('id')).then(reload); });
    $('#TasksTable').on('click', '.act-edit', function () { var b = $(this); editModal.open({ id: b.data('id'), title: b.data('title'), subject: b.data('subject'), order: b.data('order') }); });
    createModal.onResult(reload);
    editModal.onResult(reload);
});
