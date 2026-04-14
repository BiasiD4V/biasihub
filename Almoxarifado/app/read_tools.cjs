const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\guilherme.moreira\\Downloads\\ferramentas estoque.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Pegar cabeçalhos e as primeiras 10 linhas
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('--- Resumo das Colunas ---');
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
    }
    
    console.log('\n--- Primeiras 3 linhas ---');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
} catch (error) {
    console.error('Erro:', error.message);
}
