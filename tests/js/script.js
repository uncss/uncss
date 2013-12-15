var container, row, column, heading, text;

container = document.getElementById('add-here');

row = document.createElement('div');
row.className = 'row';

column = document.createElement('div');
column.className = 'col-lg-4';

heading = document.createElement('h3');
heading.className = 'test-green';
heading.innerHTML = 'PhantomJS';

text = document.createTextNode("PhantomJS works! This paragraph was added at runtime.");

column.appendChild(heading);
column.appendChild(text);
row.appendChild(column);

if (container.firstChild) {
    container.insertBefore(row, container.firstChild);
} else {
    container.appendChild(row);
}
