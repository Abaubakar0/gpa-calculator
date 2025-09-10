function addRow() {
    let table = document.getElementById("courseTable");
    let row = table.insertRow();

    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let cell5 = row.insertCell(4);

    cell1.innerHTML = `<input type="text" placeholder="Subject">`;
    cell2.innerHTML = `<input type="number" placeholder="Credit" min="1">`;
    cell3.innerHTML = `<input type="number" placeholder="Marks" min="0" max="100">`;
    cell4.innerHTML = "-";
    cell5.innerHTML = "-";
}

function getGradeAndGPA(marks) {
    if (marks >= 91) return ["A+", 4.0];
    else if (marks >= 87) return ["A", 4.0];
    else if (marks >= 80) return ["B+", 3.5];
    else if (marks >= 72) return ["B", 3.0];
    else if (marks >= 66) return ["C+", 2.5];
    else if (marks >= 60) return ["C", 2.0];
    else return ["F", 0.0];
}

function calculateGPA() {
    let table = document.getElementById("courseTable");
    let rows = table.rows;
    let totalPoints = 0;
    let totalCredits = 0;

    for (let i = 1; i < rows.length; i++) {
        let credit = parseFloat(rows[i].cells[1].children[0].value);
        let marks = parseFloat(rows[i].cells[2].children[0].value);

        if (isNaN(credit) || isNaN(marks)) continue;

        let [grade, gpa] = getGradeAndGPA(marks);
        rows[i].cells[3].innerText = grade;
        rows[i].cells[4].innerText = gpa;

        totalPoints += gpa * credit;
        totalCredits += credit;
    }

    let finalGPA = (totalPoints / totalCredits).toFixed(2);
    document.getElementById("result").innerText =
        `Your Semester GPA: ${isNaN(finalGPA) ? "N/A" : finalGPA}`;
}
