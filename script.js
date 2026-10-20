const STORAGE_KEY = 'schedule-vkk-data-v1';


const DAYS = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота'
];


const SHORT_DAYS = [
    'ПН',
    'ВТ',
    'СР',
    'ЧТ',
    'ПТ',
    'СБ'
];


/*
 * Четыре блока исходного Excel.
 *
 * Каждый блок имеет:
 * день | номер пары | группы...
 */

const BLOCKS = [

    {
        day: 0,
        lesson: 1,
        groupsStart: 2,
        groupsEnd: 8
    },

    {
        day: 8,
        lesson: 9,
        groupsStart: 10,
        groupsEnd: 16
    },

    {
        day: 16,
        lesson: 17,
        groupsStart: 18,
        groupsEnd: 24
    },

    {
        day: 24,
        lesson: 25,
        groupsStart: 26,
        groupsEnd: 31
    }

];


const HEADER_ROW = 4;


/*
 * Строка с кабинетами в исходном Excel.
 */
const ROOM_ROW = 7;


/* =========================================================
   СОСТОЯНИЕ
========================================================= */

const state = {

    rows: [],

    groups: [],

    data: {},

    group: null,

    course: 1,

    view: 'week',

    day: 0

};


/*
 * true — сейчас пользователь обновляет расписание.
 * false — обычная первая загрузка.
 */
let updateMode = false;


let selectedFile = null;


/* =========================================================
   ЭЛЕМЕНТЫ HTML
========================================================= */

const menuScreen =
    document.getElementById('screen-menu');


const groupsScreen =
    document.getElementById('screen-groups');


const scheduleScreen =
    document.getElementById('screen-schedule');


const fileInput =
    document.getElementById('fileInput');


const dropZone =
    document.getElementById('dropZone');


const fileInfo =
    document.getElementById('fileInfo');


const parseBtn =
    document.getElementById('parseBtn');


const parseError =
    document.getElementById('parseError');


const groupsList =
    document.getElementById('groupsList');


const scheduleGroupName =
    document.getElementById('scheduleGroupName');


const scheduleContent =
    document.getElementById('scheduleContent');


const dayPicker =
    document.getElementById('dayPicker');


const updateScheduleBtn =
    document.getElementById('updateScheduleBtn');


const updateScheduleBtnSchedule =
    document.getElementById(
        'updateScheduleBtnSchedule'
    );


const courseButtons =
    document.querySelectorAll(
        '.course-btn'
    );


const viewButtons =
    document.querySelectorAll(
        '.view-btn'
    );


const backButtons =
    document.querySelectorAll(
        '.btn-back'
    );


/* =========================================================
   ЭКРАНЫ
========================================================= */

function showScreen(name) {

    menuScreen.classList.remove(
        'active'
    );

    groupsScreen.classList.remove(
        'active'
    );

    scheduleScreen.classList.remove(
        'active'
    );


    if (name === 'menu') {

        menuScreen.classList.add(
            'active'
        );

    }


    if (name === 'groups') {

        groupsScreen.classList.add(
            'active'
        );

    }


    if (name === 'schedule') {

        scheduleScreen.classList.add(
            'active'
        );

    }


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveSchedule() {

    const saved = {

        groups:
            state.groups,

        data:
            state.data,

        group:
            state.group,

        course:
            state.course,

        view:
            state.view,

        day:
            state.day

    };


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(saved)
    );

}


function loadSavedSchedule() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {

            return false;

        }


        const parsed =
            JSON.parse(saved);


        if (
            !parsed ||
            !parsed.data
        ) {

            return false;

        }


        state.groups =
            parsed.groups || [];


        state.data =
            parsed.data || {};


        state.group =
            parsed.group || null;


        state.course =
            Number(
                parsed.course
            ) || 1;


        state.view =
            parsed.view || 'week';


        state.day =
            Number.isInteger(
                parsed.day
            )
                ? parsed.day
                : 0;


        return true;

    }

    catch (error) {

        console.error(
            'Ошибка загрузки сохранённого расписания:',
            error
        );


        return false;

    }

}


/* =========================================================
   ОШИБКИ
========================================================= */

function clearError() {

    parseError.textContent =
        '';

    parseError.classList.add(
        'hidden'
    );

}


function showError(message) {

    parseError.textContent =
        message;

    parseError.classList.remove(
        'hidden'
    );

}


/* =========================================================
   ВЫБОР ФАЙЛА
========================================================= */

function setSelectedFile(file) {

    if (!file) {

        return;

    }


    selectedFile =
        file;


    fileInfo.textContent =
        `Выбран файл: ${file.name}`;


    fileInfo.classList.remove(
        'hidden'
    );


    parseBtn.disabled =
        false;


    clearError();


    /*
     * ВАЖНО:
     *
     * При обновлении используется
     * ТОТ ЖЕ САМЫЙ разбор,
     * что и при первой загрузке.
     */

    if (updateMode) {

        parseSelectedFile();

    }

}


/* =========================================================
   INPUT ФАЙЛА
========================================================= */

fileInput.addEventListener(
    'change',
    function(event) {

        const file =
            event.target.files[0];


        if (!file) {

            return;

        }


        setSelectedFile(file);

    }
);


/* =========================================================
   DRAG & DROP
========================================================= */

dropZone.addEventListener(
    'dragover',
    function(event) {

        event.preventDefault();


        dropZone.classList.add(
            'dragover'
        );

    }
);


dropZone.addEventListener(
    'dragleave',
    function() {

        dropZone.classList.remove(
            'dragover'
        );

    }
);


dropZone.addEventListener(
    'drop',
    function(event) {

        event.preventDefault();


        dropZone.classList.remove(
            'dragover'
        );


        const file =
            event.dataTransfer.files[0];


        if (!file) {

            return;

        }


        setSelectedFile(file);

    }
);


/* =========================================================
   КНОПКА "РАЗОБРАТЬ"
========================================================= */

parseBtn.addEventListener(
    'click',
    function() {

        if (!selectedFile) {

            showError(
                'Сначала выберите Excel-файл.'
            );

            return;

        }


        /*
         * Обычный режим.
         */

        updateMode =
            false;


        /*
         * Используем тот же разбор.
         */

        parseSelectedFile();

    }
);


/* =========================================================
   ОБНОВЛЕНИЕ РАСПИСАНИЯ
========================================================= */

function startScheduleUpdate() {

    /*
     * Включаем режим обновления.
     */

    updateMode =
        true;


    clearError();


    /*
     * Сбрасываем старый выбор файла.
     *
     * Благодаря этому можно выбрать
     * даже тот же самый Excel.
     */

    selectedFile =
        null;


    fileInput.value =
        '';


    /*
     * Открываем обычное окно выбора файла.
     */

    fileInput.click();

}


/*
 * Кнопка на экране групп.
 */

if (updateScheduleBtn) {

    updateScheduleBtn.addEventListener(
        'click',
        startScheduleUpdate
    );

}


/*
 * Кнопка на экране расписания.
 */

if (updateScheduleBtnSchedule) {

    updateScheduleBtnSchedule.addEventListener(
        'click',
        startScheduleUpdate
    );

}


/* =========================================================
   ЕДИНЫЙ РАЗБОР EXCEL
========================================================= */

async function parseSelectedFile() {

    if (!selectedFile) {

        return;

    }


    /*
     * Запоминаем группу,
     * на которой находился пользователь.
     */

    const oldGroup =
        state.group;


    const oldCourse =
        state.course;


    try {

        clearError();


        parseBtn.disabled =
            true;


        parseBtn.textContent =
            'Разбираю...';


        /*
         * Читаем Excel.
         */

        const buffer =
            await selectedFile.arrayBuffer();


        const workbook =
            XLSX.read(
                buffer,
                {
                    type: 'array'
                }
            );


        if (
            !workbook.SheetNames.length
        ) {

            throw new Error(
                'В Excel-файле не найдено ни одного листа.'
            );

        }


        /*
         * Берём первый лист.
         */

        const worksheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        /*
         * Переводим Excel
         * в массив строк.
         */

        const rows =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    header: 1,
                    defval: '',
                    blankrows: true
                }
            );


        if (!rows.length) {

            throw new Error(
                'Excel-файл пустой.'
            );

        }


        /*
         * ОДИН И ТОТ ЖЕ ПАРСЕР
         * используется и для первой загрузки,
         * и для обновления.
         */

        const result =
            parseSchedule(rows);


        if (
            !result.groups.length
        ) {

            throw new Error(
                'Не удалось найти группы в Excel-файле.'
            );

        }


        /*
         * Полностью заменяем старое расписание
         * новым.
         */

        state.rows =
            rows;


        state.groups =
            result.groups;


        state.data =
            result.data;


        /*
         * Если старая группа есть
         * в новом расписании —
         * оставляем её.
         */

        if (
            oldGroup &&
            state.groups.includes(
                oldGroup
            )
        ) {

            state.group =
                oldGroup;

        }

        else {

            state.group =
                null;

        }


        /*
         * Курс сохраняем.
         */

        state.course =
            oldCourse;


        /*
         * После нового Excel
         * начинаем с недели.
         */

        state.view =
            'week';


        state.day =
            0;


        /*
         * Сохраняем новое расписание.
         */

        saveSchedule();


        /*
         * Очищаем выбранный файл.
         */

        selectedFile =
            null;


        fileInput.value =
            '';


        fileInfo.textContent =
            '';


        fileInfo.classList.add(
            'hidden'
        );


        updateMode =
            false;


        /*
         * Если пользователь был
         * в конкретной группе
         * и она существует в новом Excel —
         * сразу возвращаем его туда.
         */

        if (
            oldGroup &&
            state.group === oldGroup
        ) {

            scheduleGroupName.textContent =
                state.group;


            renderSchedule();


            showScreen(
                'schedule'
            );

        }

        else {

            /*
             * Если группы больше нет —
             * показываем список групп.
             */

            renderGroups();


            showScreen(
                'groups'
            );

        }

    }

    catch (error) {

        console.error(
            'Ошибка обработки Excel:',
            error
        );


        updateMode =
            false;


        showError(
            `Ошибка загрузки расписания: ${error.message}`
        );

    }

    finally {

        parseBtn.disabled =
            !selectedFile;


        parseBtn.textContent =
            'Разобрать';

    }

}


/* =========================================================
   РАЗБОР РАСПИСАНИЯ
========================================================= */

function parseSchedule(rows) {
    const groupsSet = new Set();
    const data = {};

    // Извлекаем названия групп из заголовков, даже если в одной
    // ячейке Excel записано несколько групп.
    function groupsFromHeader(value) {
        const text = String(value || '').replace(/[\r\n]+/g, ' ').trim();
        const matches = text.match(/[А-ЯЁA-Z]{1,5}\s*-\s*\d{1,2}\s*А?/gi);
        if (!matches) return [];

        return matches.map(group =>
            group.toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, '')
        );
    }

    // 1. Считываем группы и привязываем их к реальным столбцам Excel.
    for (const block of BLOCKS) {
        const header = rows[HEADER_ROW] || [];

        for (let col = block.groupsStart; col < block.groupsEnd; col++) {
            const groups = groupsFromHeader(header[col]);

            for (const group of groups) {
                groupsSet.add(group);
                if (!data[group]) {
                    data[group] = {};
                    for (let day = 0; day < 6; day++) data[group][day] = [];
                }
            }
        }
    }

    // 2. Находим строки, где начинается каждый день.
    // В исходном файле метка дня стоит на строке ВТОРОЙ пары,
    // поэтому первая пара находится на строке выше.
    const dayRows = Array(6).fill(undefined);

    for (let rowIndex = HEADER_ROW; rowIndex < rows.length; rowIndex++) {
        for (const block of BLOCKS) {
            const value = String((rows[rowIndex] || [])[block.day] || '')
                .trim()
                .toUpperCase();
            const day = SHORT_DAYS.indexOf(value);

            if (day !== -1 && dayRows[day] === undefined) {
                dayRows[day] = rowIndex;
            }
        }
    }

    // 3. Читаем каждый день отдельным диапазоном, как в первоначальной
    // рабочей версии. Это не позволяет первой паре попасть в предыдущий день.
    for (let day = 0; day < 6; day++) {
        if (dayRows[day] === undefined) continue;

        const startRow = Math.max(HEADER_ROW + 1, dayRows[day] - 1);

        let nextDayRow = rows.length;
        for (let nextDay = day + 1; nextDay < 6; nextDay++) {
            if (dayRows[nextDay] !== undefined) {
                nextDayRow = dayRows[nextDay];
                break;
            }
        }

        const endRow = nextDayRow === rows.length
            ? rows.length
            : Math.max(startRow, nextDayRow - 1);

        for (const block of BLOCKS) {
            const header = rows[HEADER_ROW] || [];
            const columnGroups = {};

            for (let col = block.groupsStart; col < block.groupsEnd; col++) {
                columnGroups[col] = groupsFromHeader(header[col]);
            }

            for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
                const row = rows[rowIndex] || [];
                const lessonColumnText = String(row[block.lesson] ?? '').trim();
                const columnNumberMatch = lessonColumnText.match(/^(\d{1,2})/);
                const columnNumber = columnNumberMatch ? columnNumberMatch[1] : '';

                for (let col = block.groupsStart; col < block.groupsEnd; col++) {
                    const groups = columnGroups[col] || [];
                    if (!groups.length) continue;

                    const rawValue = String(row[col] ?? '').trim();
                    if (!rawValue) continue;

                    const lessonInfo = parseLesson(rawValue);
                    if (!lessonInfo || !lessonInfo.subject) continue;

                    const number = lessonInfo.number || columnNumber;
                    if (!number) continue;

                    // Аудитория из конкретной ячейки имеет приоритет.
                    // Если её там нет, берём закреплённую аудиторию группы из строки кабинетов.
                    let room = lessonInfo.room;
                    if (!room) {
                        const roomHeader = String((rows[ROOM_ROW] || [])[col] ?? '');
                        const roomMatch = roomHeader.match(/(\d{3}(?:\s*,\s*\d{3})*)/);
                        if (roomMatch) room = roomMatch[1].replace(/\s+/g, '');
                    }

                    const lesson = {
                        number: String(number),
                        subject: lessonInfo.subject,
                        teacher: lessonInfo.teacher,
                        room,
                        note: lessonInfo.note
                    };

                    for (const group of groups) {
                        if (!data[group]) {
                            data[group] = {};
                            for (let d = 0; d < 6; d++) data[group][d] = [];
                        }
                        data[group][day].push({ ...lesson });
                    }
                }
            }
        }
    }

    // 4. Удаляем дубли, сохраняя разные предметы и аудитории.
    for (const group of Object.keys(data)) {
        for (let day = 0; day < 6; day++) {
            const seen = new Set();
            data[group][day] = (data[group][day] || []).filter(lesson => {
                const key = [
                    lesson.number, lesson.subject, lesson.teacher, lesson.room, lesson.note
                ].join('|');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            data[group][day].sort((a, b) =>
                (Number(a.number) || 999) - (Number(b.number) || 999)
            );
        }
    }

    return {
        groups: Array.from(groupsSet).sort(compareGroups),
        data
    };
}

/* =========================================================
   РАЗДЕЛЕНИЕ ГРУПП
========================================================= */

function splitGroups(value) {

    if (!value) {

        return [];

    }


    const text =
        String(value)
            .replace(
                /\r/g,
                ' '
            )
            .replace(
                /\n/g,
                ' '
            )
            .trim();


    if (!text) {

        return [];

    }


    /*
     * В Excel группы внутри одной
     * ячейки разделяются несколькими
     * пробелами.
     */

    const parts =
        text
            .split(/\s{2,}/)
            .map(
                function(item) {

                    return item.trim();

                }
            )
            .filter(Boolean);


    return parts.length
        ? parts
        : [text];

}


/* =========================================================
   ДЕНЬ
========================================================= */

function getDayIndex(value) {

    if (!value) {

        return null;

    }


    const text =
        String(value)
            .trim()
            .toUpperCase();


    const variants = [

        ['ПН', 'ПОНЕДЕЛЬНИК'],

        ['ВТ', 'ВТОРНИК'],

        ['СР', 'СРЕДА'],

        ['ЧТ', 'ЧЕТВЕРГ'],

        ['ПТ', 'ПЯТНИЦА'],

        ['СБ', 'СУББОТА']

    ];


    for (
        let i = 0;
        i < variants.length;
        i++
    ) {

        if (
            text === variants[i][0] ||
            text === variants[i][1]
        ) {

            return i;

        }

    }


    return null;

}


/* =========================================================
   НОМЕР ПАРЫ
========================================================= */

function parseLessonNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';

    }


    const text =
        String(value).trim();


    const match =
        text.match(
            /^(\d{1,2})(?:[\s.)-]|$)/
        );


    if (!match) {

        return '';

    }


    return match[1];

}


/* =========================================================
   ПРЕДМЕТ
========================================================= */

function parseLesson(value) {
    let text = String(value || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!text) return null;

    let number = '';
    const numberMatch = text.match(/^(\d{1,2})(?:\s*,\s*\d{1,2})?\s+/);
    if (numberMatch) {
        number = numberMatch[1];
        text = text.substring(numberMatch[0].length).trim();
    }

    if (/^ПРАКТИКА$/i.test(text)) {
        return { number, subject: 'Практика', teacher: '', room: '', note: '' };
    }

    if (/^ЭКЗАМЕН/i.test(text)) {
        return { number, subject: text, teacher: '', room: '', note: '' };
    }

    let room = '';
    let note = '';
    let teacher = '';

    // Сначала убираем аудиторию в конце ячейки, если она указана там.
    const roomMatch = text.match(/(?:^|\s)(?:ауд\.?\s*)?(\d{3})(?:\s*,\s*(\d{3}))?\s*$/i);
    if (roomMatch) {
        room = roomMatch[1] + (roomMatch[2] ? ',' + roomMatch[2] : '');
        text = text.slice(0, roomMatch.index).trim();
    }

    // Самостоятельная работа / временные пометки.
    const noteMatch = text.match(/сам\.?\s*раб\.?|с\s*\d{1,2}-\d{2}/i);
    if (noteMatch) {
        note = noteMatch[0].trim();
        text = text.replace(noteMatch[0], '').replace(/\s+/g, ' ').trim();
    }

    // Полностью сохраняем ФИО преподавателя, а не только фамилию.
    const teacherMatch = text.match(/([А-ЯЁ][а-яё-]+(?:-[А-ЯЁ][а-яё-]+)?\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.?)$/i);
    if (teacherMatch) {
        teacher = teacherMatch[1].replace(/\s+/g, ' ').trim();
        text = text.replace(teacherMatch[1], '').trim();
    }

    return {
        number,
        subject: text.replace(/[,;.]$/, '').trim(),
        teacher,
        room,
        note
    };
}

/* =========================================================
   КАБИНЕТ
========================================================= */

/* =========================================================
   REGEX
========================================================= */

function escapeRegExp(text) {

    return String(text)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
        );

}


/* =========================================================
   СОРТИРОВКА ГРУПП
========================================================= */

function compareGroups(
    a,
    b
) {

    const getNumber =
        function(value) {

            const match =
                String(value)
                    .match(/\d+/);


            return match
                ? Number(match[0])
                : 999;

        };


    const na =
        getNumber(a);


    const nb =
        getNumber(b);


    if (
        na !== nb
    ) {

        return na - nb;

    }


    return String(a)
        .localeCompare(
            String(b),
            'ru'
        );

}


/* =========================================================
   КУРС ГРУППЫ
========================================================= */

function getGroupCourse(
    group
) {

    const match =
        String(group)
            .match(
                /(\d{2})/
            );


    if (!match) {

        return 1;

    }


    const number =
        Number(
            match[1]
        );


    const course =
        Math.floor(
            number / 10
        );


    if (
        course >= 1 &&
        course <= 4
    ) {

        return course;

    }


    return 1;

}


/* =========================================================
   ОТОБРАЖЕНИЕ ГРУПП
========================================================= */

function renderGroups() {

    groupsList.innerHTML =
        '';


    const filteredGroups =
        state.groups.filter(
            function(group) {

                return (
                    getGroupCourse(group) ===
                    state.course
                );

            }
        );


    if (
        !filteredGroups.length
    ) {

        groupsList.innerHTML =
            `
            <div class="empty-state">
                Для этого курса групп не найдено.
            </div>
            `;

        return;

    }


    for (
        const group of filteredGroups
    ) {

        const button =
            document.createElement(
                'button'
            );


        button.type =
            'button';


        /*
         * Используем group-btn.
         */

        button.className =
            'group-btn';


        button.textContent =
            group;


        button.addEventListener(
            'click',
            function() {

                openSchedule(
                    group
                );

            }
        );


        groupsList.appendChild(
            button
        );

    }

}


/* =========================================================
   КУРСЫ
========================================================= */

courseButtons.forEach(
    function(button) {

        button.addEventListener(
            'click',
            function() {

                courseButtons.forEach(
                    function(item) {

                        item.classList.remove(
                            'active'
                        );

                    }
                );


                button.classList.add(
                    'active'
                );


                state.course =
                    Number(
                        button.dataset.course
                    );


                renderGroups();

            }
        );

    }
);


/* =========================================================
   ОТКРЫТЬ РАСПИСАНИЕ
========================================================= */

function openSchedule(
    group
) {

    state.group =
        group;


    state.view =
        'week';


    state.day =
        0;


    scheduleGroupName.textContent =
        group;


    saveSchedule();


    updateDayPicker();


    renderSchedule();


    showScreen(
        'schedule'
    );

}


/* =========================================================
   ОТОБРАЖЕНИЕ РАСПИСАНИЯ
========================================================= */

function renderSchedule() {

    if (!state.group) {

        return;

    }


    scheduleGroupName.textContent =
        state.group;


    viewButtons.forEach(
        function(button) {

            button.classList.toggle(
                'active',
                button.dataset.view ===
                state.view
            );

        }
    );


    dayPicker.classList.toggle(
        'hidden',
        state.view !== 'day'
    );


    scheduleContent.innerHTML =
        '';


    if (
        state.view === 'week'
    ) {

        for (
            let day = 0;
            day < 6;
            day++
        ) {

            renderDayBlock(
                day,
                scheduleContent
            );

        }

    }

    else {

        renderDayBlock(
            state.day,
            scheduleContent
        );

    }


    updateDayPicker();

}


/* =========================================================
   ОДИН ДЕНЬ
========================================================= */

function renderDayBlock(
    day,
    container
) {

    const groupData =
        state.data[
            state.group
        ];


    const lessons =
        groupData &&
        groupData[day]
            ? groupData[day]
            : [];


    const dayBlock =
        document.createElement(
            'div'
        );


    dayBlock.className =
        'day-block';


    const title =
        document.createElement(
            'div'
        );


    title.className =
        'day-title';


    title.textContent =
        DAYS[day];


    dayBlock.appendChild(
        title
    );


    if (!lessons.length) {

        const empty =
            document.createElement(
                'div'
            );


        empty.className =
            'empty-day';


        empty.textContent =
            'Занятий нет';


        dayBlock.appendChild(
            empty
        );


        container.appendChild(
            dayBlock
        );


        return;

    }


    for (
        const lesson of lessons
    ) {

        const lessonElement =
            document.createElement(
                'div'
            );


        lessonElement.className =
            'lesson';


        /*
         * Номер пары.
         */

        if (lesson.number) {

            const number =
                document.createElement(
                    'div'
                );


            number.className =
                'lesson-num';


            number.textContent =
                lesson.number;


            lessonElement.appendChild(
                number
            );

        }


        const body =
            document.createElement(
                'div'
            );


        body.className =
            'lesson-body';


        /*
         * Предмет.
         */

        const subject =
            document.createElement(
                'div'
            );


        subject.className =
            'lesson-subject';


        subject.textContent =
            lesson.subject ||
            'Без названия';


        body.appendChild(
            subject
        );


        /*
         * Преподаватель.
         */

        if (
            lesson.teacher
        ) {

            const teacher =
                document.createElement(
                    'div'
                );


            teacher.className =
                'lesson-teacher';


            teacher.textContent =
                lesson.teacher;


            body.appendChild(
                teacher
            );

        }


        /*
         * Кабинет.
         */

        if (
            lesson.room
        ) {

            const room =
                document.createElement(
                    'div'
                );


            room.className =
                'lesson-room';


            room.textContent =
                `Кабинет: ${lesson.room}`;


            body.appendChild(
                room
            );

        }


        /*
         * Примечание.
         */

        if (
            lesson.note
        ) {

            const note =
                document.createElement(
                    'div'
                );


            note.className =
                'lesson-note';


            note.textContent =
                lesson.note;


            body.appendChild(
                note
            );

        }


        lessonElement.appendChild(
            body
        );


        dayBlock.appendChild(
            lessonElement
        );

    }


    container.appendChild(
        dayBlock
    );

}


/* =========================================================
   НЕДЕЛЯ / ДЕНЬ
========================================================= */

viewButtons.forEach(
    function(button) {

        button.addEventListener(
            'click',
            function() {

                state.view =
                    button.dataset.view;


                saveSchedule();


                renderSchedule();

            }
        );

    }
);


/* =========================================================
   ВЫБОР ДНЯ
========================================================= */

function updateDayPicker() {

    if (!dayPicker) {

        return;

    }


    const buttons =
        dayPicker.querySelectorAll(
            'button[data-day]'
        );


    buttons.forEach(
        function(button) {

            const day =
                Number(
                    button.dataset.day
                );


            button.classList.toggle(
                'active',
                day === state.day
            );


            button.onclick =
                function() {

                    state.day =
                        Number(
                            button.dataset.day
                        );


                    saveSchedule();


                    renderSchedule();

                };

        }
    );

}


/* =========================================================
   НАЗАД
========================================================= */

backButtons.forEach(
    function(button) {

        button.addEventListener(
            'click',
            function() {

                const target =
                    button.dataset.back;


                if (
                    target === 'menu'
                ) {

                    showScreen(
                        'menu'
                    );

                }


                else if (
                    target === 'groups'
                ) {

                    renderGroups();


                    showScreen(
                        'groups'
                    );

                }

            }
        );

    }
);


/* =========================================================
   ЗАПУСК
========================================================= */

function init() {

    showScreen(
        'menu'
    );


    const loaded =
        loadSavedSchedule();


    if (!loaded) {

        return;

    }


    /*
     * Восстанавливаем курс.
     */

    courseButtons.forEach(
        function(button) {

            const course =
                Number(
                    button.dataset.course
                );


            button.classList.toggle(
                'active',
                course ===
                state.course
            );

        }
    );


    updateDayPicker();


    /*
     * Если группа сохранена —
     * открываем её расписание.
     */

    if (
        state.group &&
        state.data[state.group]
    ) {

        scheduleGroupName.textContent =
            state.group;


        renderSchedule();


        showScreen(
            'schedule'
        );

    }

    else {

        renderGroups();


        showScreen(
            'groups'
        );

    }

}


init();


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
    'serviceWorker' in navigator
) {

    window.addEventListener(
        'load',
        function() {

            navigator.serviceWorker
                .register(
                    './service-worker.js'
                )

                .then(
                    function(registration) {

                        console.log(
                            'Service Worker зарегистрирован:',
                            registration.scope
                        );

                    }
                )

                .catch(
                    function(error) {

                        console.error(
                            'Ошибка Service Worker:',
                            error
                        );

                    }
                );

        }
    );

}