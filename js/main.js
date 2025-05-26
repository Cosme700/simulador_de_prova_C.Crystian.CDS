// Simulador de Prova - beta 1.0

function showSection(sectionId) {
    document.getElementById("home-container").style.display = "none";
    document.getElementById("config-container").style.display = "none";
    document.getElementById("creation-container").style.display = "none";
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("report-container").style.display = "none";
    document.getElementById("list-provas-container").style.display = "none";
    if (sectionId) {
        document.getElementById(sectionId).style.display = "";
    }
}

const questions = [
    {
        question: "Qual é a capital da França?",
        options: ["Berlim", "Madri", "Paris", "Lisboa"],
        answer: 2
    },
    {
        question: "Qual é a fórmula da água?",
        options: ["H2O", "CO2", "O2", "NaCl"],
        answer: 0
    },
    {
        question: "Quem escreveu 'Dom Casmurro'?",
        options: ["Machado de Assis", "José de Alencar", "Clarice Lispector", "Jorge Amado"],
        answer: 0
    }
];

let currentQuestionIndex = 0;
let score = 0;
let provaAtual = null;
let tempoRestante = 0;
let timerInterval = null;

function iniciarProvaSelecionada(prova) {
    provaAtual = prova;
    tempoRestante = prova.tempo ? prova.tempo * 60 : 0;
    showSection("quiz-container");
    if (prova.quiz && prova.quiz.length > 0) {
        // Embaralha questões e alternativas
        const quizRandom = prepareQuizForUser(prova.quiz);
        renderQuiz(quizRandom);
        // Salva referência para correção e timer
        provaAtual._quizRandom = quizRandom;
        if (tempoRestante > 0) {
            iniciarCronometro();
        }
    } else {
        alert("A prova selecionada não contém questões.");
        showSection("list-provas-container");
    }
}

function renderQuiz(quiz) {
    const quizContainer = document.getElementById("quiz-container");
    quizContainer.innerHTML = "";

    // Traduções dos botões e tempo
    const lang = typeof window.currentLang === "string" ? window.currentLang : "ptbr";
    const btnLabels = {
        ptbr: { back: "Voltar", next: "Avançar", send: "Enviar Respostas", timer: "Tempo restante", test: "Prova de Teste", home: "Voltar ao Início" },
        en:   { back: "Back", next: "Next", send: "Submit Answers", timer: "Time left", test: "Test Demo", home: "Back to Home" },
        es:   { back: "Volver", next: "Avanzar", send: "Enviar Respuestas", timer: "Tiempo restante", test: "Prueba de Demostración", home: "Volver al Inicio" },
        fr:   { back: "Retour", next: "Suivant", send: "Envoyer les Réponses", timer: "Temps restant", test: "Test Démo", home: "Retour à l'Accueil" },
        it:   { back: "Indietro", next: "Avanti", send: "Invia Risposte", timer: "Tempo rimasto", test: "Test Dimostrativo", home: "Torna all'Inizio" }
    };

    if (provaAtual && provaAtual.nome) {
        let titulo = document.createElement("h2");
        if (provaAtual.nome === "Prova de Teste" || provaAtual.nome === btnLabels.ptbr.test) {
            titulo.textContent = btnLabels[lang].test;
        } else {
            titulo.textContent = provaAtual.nome;
        }
        quizContainer.appendChild(titulo);
    }

    // Estado para navegação entre questões
    if (typeof renderQuiz.currentIndex !== "number") renderQuiz.currentIndex = 0;
    let idx = renderQuiz.currentIndex;
    if (idx < 0) idx = 0;
    if (idx >= quiz.length) idx = quiz.length - 1;
    renderQuiz.currentIndex = idx;

    // Armazena respostas selecionadas
    if (!renderQuiz.respostas) renderQuiz.respostas = new Array(quiz.length).fill(null);

    // Cronômetro
    if (tempoRestante > 0) {
        let cronDiv = document.createElement("div");
        cronDiv.id = "cronometro";
        cronDiv.style = "font-weight:bold;margin:12px 0;";
        quizContainer.appendChild(cronDiv);
        atualizarCronometro();
    }

    // Exibe apenas a questão atual
    const q = quiz[idx];
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `
        <h3>${idx + 1}. ${q.enunciado}</h3>
        <div>
            ${q.alternativas.map((alt, i) => `
                <label style="display:block;margin-bottom:4px;">
                    <input type="radio" name="quiz_q${idx}" value="${i}" ${renderQuiz.respostas[idx] === i ? "checked" : ""}>
                    ${String.fromCharCode(65 + i)}) ${alt}
                </label>
            `).join('')}
        </div>
    `;
    quizContainer.appendChild(div);

    // Navegação
    const navDiv = document.createElement("div");
    navDiv.style = "display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:12px;";
    // Botão Voltar
    const btnVoltar = document.createElement("button");
    btnVoltar.textContent = btnLabels[lang].back;
    btnVoltar.disabled = idx === 0;
    btnVoltar.onclick = () => {
        salvarRespostaAtual();
        renderQuiz.currentIndex = idx - 1;
        renderQuiz(quiz);
    };
    navDiv.appendChild(btnVoltar);

    // Botão Avançar ou Enviar
    const btnAvancar = document.createElement("button");
    if (idx < quiz.length - 1) {
        btnAvancar.textContent = btnLabels[lang].next;
        btnAvancar.onclick = () => {
            salvarRespostaAtual();
            renderQuiz.currentIndex = idx + 1;
            renderQuiz(quiz);
        };
    } else {
        btnAvancar.textContent = btnLabels[lang].send;
        btnAvancar.onclick = () => {
            salvarRespostaAtual();
            finalizarProvaComRespostas(quiz, renderQuiz.respostas);
        };
    }
    navDiv.appendChild(btnAvancar);

    quizContainer.appendChild(navDiv);

    // Esconde botão global de envio (fora do quadrado branco)
    document.getElementById("submit-btn").style.display = "none";

    // Salva resposta ao selecionar alternativa
    function salvarRespostaAtual() {
        const marcada = quizContainer.querySelector(`input[name="quiz_q${idx}"]:checked`);
        renderQuiz.respostas[idx] = marcada ? Number(marcada.value) : null;
    }
}

// Novo finalizarProva que usa as respostas navegadas
function finalizarProvaComRespostas(quiz, respostasMarcadas) {
    clearInterval(timerInterval);

    // Traduções do relatório
    const lang = typeof window.currentLang === "string" ? window.currentLang : "ptbr";
    const reportLabels = {
        ptbr: {
            relatorio: "Relatório da Prova",
            resultado: (acertos, total) => `Resultado: ${acertos} de ${total} questões corretas`,
            porcentagem: "Porcentagem de acertos",
            acertos: "Acertos",
            erros: "Erros",
            home: "Voltar ao Início"
        },
        en: {
            relatorio: "Test Report",
            resultado: (acertos, total) => `Result: ${acertos} out of ${total} correct answers`,
            porcentagem: "Percentage of correct answers",
            acertos: "Correct",
            erros: "Incorrect",
            home: "Back to Home"
        },
        es: {
            relatorio: "Informe de la Prueba",
            resultado: (acertos, total) => `Resultado: ${acertos} de ${total} respuestas correctas`,
            porcentagem: "Porcentaje de aciertos",
            acertos: "Aciertos",
            erros: "Errores",
            home: "Volver al Inicio"
        },
        fr: {
            relatorio: "Rapport du Test",
            resultado: (acertos, total) => `Résultat : ${acertos} sur ${total} bonnes réponses`,
            porcentagem: "Pourcentage de bonnes réponses",
            acertos: "Bonnes réponses",
            erros: "Erreurs",
            home: "Retour à l'Accueil"
        },
        it: {
            relatorio: "Rapporto del Test",
            resultado: (acertos, total) => `Risultato: ${acertos} su ${total} risposte corrette`,
            porcentagem: "Percentuale di risposte corrette",
            acertos: "Corrette",
            erros: "Errori",
            home: "Torna all'Inizio"
        }
    };

    let acertos = 0;
    let respostas = [];
    quiz.forEach((q, idx) => {
        const marcadaIdx = respostasMarcadas[idx];
        respostas.push({
            marcada: marcadaIdx,
            correta: q.correta,
            alternativas: q.alternativas,
            justificativa: q.justificativa,
            enunciado: q.enunciado
        });
        if (marcadaIdx === q.correta) acertos++;
    });
    const total = quiz.length;
    const erros = total - acertos;
    const porcentagem = total > 0 ? ((acertos / total) * 100).toFixed(1) : "0";

    showSection("report-container");
    // Traduz título do relatório
    document.querySelector('#report-container h2').textContent = reportLabels[lang].relatorio;

    const report = document.getElementById("report-content");
    let html = `
        <h3>${reportLabels[lang].resultado(acertos, total)}</h3>
        <p>${reportLabels[lang].porcentagem}: <b>${porcentagem}%</b></p>
        <p>${reportLabels[lang].acertos}: <b>${acertos}</b> &nbsp;|&nbsp; ${reportLabels[lang].erros}: <b>${erros}</b></p>
    `;
    respostas.forEach((r, idx) => {
        html += `
            <div style="margin-bottom:16px;">
                <b>${idx + 1}. ${r.enunciado}</b><br>
                Sua resposta: ${r.marcada !== null ? String.fromCharCode(65 + r.marcada) + ') ' + r.alternativas[r.marcada] : '<i>Não respondida</i>'}<br>
                Resposta correta: ${String.fromCharCode(65 + r.correta)}) ${r.alternativas[r.correta]}<br>
                <span style="color:#45a049;">Justificativa: ${r.justificativa}</span>
            </div>
        `;
    });
    html += `<div style="text-align:center;margin-top:24px;">
        <button id="back-to-home-btn" style="margin:16px 0 8px 0;">${reportLabels[lang].home}</button>
    </div>`;
    report.innerHTML = html;
    document.getElementById("submit-btn").style.display = "none";

    setTimeout(() => {
        const btn = document.getElementById("back-to-home-btn");
        if (btn) {
            btn.onclick = () => showSection("home-container");
        }
    }, 0);

    // Limpa estado de respostas e índice
    renderQuiz.respostas = null;
    renderQuiz.currentIndex = 0;
}

function iniciarCronometro() {
    atualizarCronometro();
    timerInterval = setInterval(() => {
        tempoRestante--;
        atualizarCronometro();
        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            alert("Tempo esgotado!");
            if (provaAtual) finalizarProva(provaAtual.quiz);
        }
    }, 1000);
}

function atualizarCronometro() {
    const cronDiv = document.getElementById("cronometro");
    if (cronDiv) {
        const min = Math.floor(tempoRestante / 60);
        const seg = tempoRestante % 60;
        const lang = typeof window.currentLang === "string" ? window.currentLang : "ptbr";
        const timerLabels = {
            ptbr: "Tempo restante",
            en: "Time left",
            es: "Tiempo restante",
            fr: "Temps restant",
            it: "Tempo rimasto"
        };
        cronDiv.textContent = `${timerLabels[lang]}: ${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
    }
}

// Função utilitária para embaralhar arrays (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Embaralha alternativas e ajusta o índice da correta
function shuffleAlternatives(question) {
    const original = question.alternativas.map((alt, idx) => ({
        text: alt,
        originalIdx: idx
    }));
    const correctText = question.alternativas[question.correta];
    shuffleArray(original);
    question.alternativas = original.map(o => o.text);
    question.correta = question.alternativas.findIndex(alt => alt === correctText);
}

// Embaralha questões e alternativas antes de exibir ao usuário
function prepareQuizForUser(quizArr) {
    const quizCopy = JSON.parse(JSON.stringify(quizArr));
    shuffleArray(quizCopy);
    quizCopy.forEach(q => shuffleAlternatives(q));
    return quizCopy;
}

// ========== INICIALIZAÇÃO PRINCIPAL ==========
document.addEventListener("DOMContentLoaded", () => {
    // Versão beta 1.0
    console.log("Simulador de Prova - beta 1.0");
    // Verifica se o script foi carregado
    console.log("Script carregado com sucesso");

    // Esconde todas as seções exceto a home
    showSection("home-container");

    // Botão "Criar Prova"
    document.getElementById("start-btn").onclick = function() {
        showSection("config-container");
    };

    // Formulário de configuração
    document.getElementById("config-form").onsubmit = function (e) {
        e.preventDefault();
        const numQuestions = parseInt(document.getElementById("num-questions").value, 10);
        if (isNaN(numQuestions) || numQuestions < 1) return;
        generateQuestionFields(numQuestions);
        showSection("creation-container");
    };

    // Gera campos para criação das questões
    function generateQuestionFields(num) {
        const container = document.getElementById("questions-fields");
        container.innerHTML = "";
        for (let i = 0; i < num; i++) {
            const qDiv = document.createElement("div");
            qDiv.className = "question-creation";
            qDiv.style.marginBottom = "24px";
            qDiv.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <label>Enunciado:</label>
                <textarea name="enunciado${i}" required rows="2" style="width:100%;margin-bottom:8px;"></textarea>
                <div>
                    <label>Alternativas:</label>
                    <div style="display:flex;align-items:center;margin-bottom:4px;">
                        <input type="radio" name="correta${i}" value="0" required style="margin-right:6px;">
                        <input type="text" name="alt${i}_0" placeholder="Alternativa A" required style="width:80%;">
                    </div>
                    <div style="display:flex;align-items:center;margin-bottom:4px;">
                        <input type="radio" name="correta${i}" value="1" style="margin-right:6px;">
                        <input type="text" name="alt${i}_1" placeholder="Alternativa B" required style="width:80%;">
                    </div>
                    <div style="display:flex;align-items:center;margin-bottom:4px;">
                        <input type="radio" name="correta${i}" value="2" style="margin-right:6px;">
                        <input type="text" name="alt${i}_2" placeholder="Alternativa C" required style="width:80%;">
                    </div>
                    <div style="display:flex;align-items:center;margin-bottom:4px;">
                        <input type="radio" name="correta${i}" value="3" style="margin-right:6px;">
                        <input type="text" name="alt${i}_3" placeholder="Alternativa D" required style="width:80%;">
                    </div>
                </div>
                <label>Justificativa da resposta correta:</label>
                <textarea name="justificativa${i}" required rows="2" style="width:100%;margin-bottom:8px;"></textarea>
                <hr>
            `;
            container.appendChild(qDiv);
        }
    }

    // Botão "Voltar ao Menu Inicial" na criação de questões
    document.getElementById("back-home-btn").onclick = function() {
        showSection("home-container");
    };

    // Salvar prova criada
    document.getElementById("creation-form").onsubmit = function(e) {
        e.preventDefault();
        const numQuestions = document.querySelectorAll('.question-creation').length;
        const quiz = [];
        for (let i = 0; i < numQuestions; i++) {
            const enunciado = this[`enunciado${i}`].value;
            const alternativas = [
                this[`alt${i}_0`].value,
                this[`alt${i}_1`].value,
                this[`alt${i}_2`].value,
                this[`alt${i}_3`].value
            ];
            const correta = this[`correta${i}`].value;
            const justificativa = this[`justificativa${i}`].value;
            quiz.push({
                enunciado,
                alternativas,
                correta: Number(correta),
                justificativa
            });
        }
        let provas = JSON.parse(localStorage.getItem("provas") || "[]");
        const nome = prompt("Digite um nome para esta prova:", `Prova ${provas.length + 1}`);
        const tempo = parseInt(document.getElementById("duration").value, 10) || 0;
        provas.push({ nome, quiz, tempo });
        localStorage.setItem("provas", JSON.stringify(provas));
        alert("Prova salva com sucesso!");
        showSection("home-container");
    };

    // Botão "Visualizar Provas Existentes"
    document.getElementById("view-btn").onclick = function() {
        renderProvasList();
    };

    function renderProvasList() {
        let provas = JSON.parse(localStorage.getItem("provas") || "[]");
        showSection("list-provas-container");
        const listDiv = document.getElementById("provas-list");
        if (provas.length === 0) {
            listDiv.innerHTML = "<p>Nenhuma prova salva.</p>";
            return;
        }
        listDiv.innerHTML = provas.map((p, idx) => `
            <div style="margin-bottom:12px;padding:10px;border:1px solid #eee;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">
                <span><b>${p.nome}</b></span>
                <span>
                    <button type="button" data-idx="${idx}" class="start-prova-btn" style="margin-left:12px;">Iniciar Prova</button>
                    <button type="button" data-idx="${idx}" class="delete-prova-btn" style="margin-left:8px;background:#c0392b;">Excluir</button>
                </span>
            </div>
        `).join('');
        // Evento iniciar prova
        document.querySelectorAll(".start-prova-btn").forEach(btn => {
            btn.onclick = function() {
                const idx = Number(this.getAttribute("data-idx"));
                const provas = JSON.parse(localStorage.getItem("provas") || "[]");
                const prova = provas[idx];
                if (!prova.tempo) {
                    prova.tempo = 0;
                }
                provaAtual = prova;
                showSection("quiz-container");
                iniciarProvaSelecionada(prova);
            };
        });
        // Evento excluir prova
        document.querySelectorAll(".delete-prova-btn").forEach(btn => {
            btn.onclick = function() {
                const idx = Number(this.getAttribute("data-idx"));
                let provas = JSON.parse(localStorage.getItem("provas") || "[]");
                if (confirm(`Deseja realmente excluir a prova "${provas[idx].nome}"?`)) {
                    provas.splice(idx, 1);
                    localStorage.setItem("provas", JSON.stringify(provas));
                    renderProvasList();
                }
            };
        });
    }

    // Botão voltar ao menu na lista de provas
    document.getElementById("back-home-list-btn").onclick = function() {
        showSection("home-container");
    };

    // Botão "Importar"
    document.getElementById("import-btn").onclick = function() {
        document.getElementById("import-file").click();
    };

    document.getElementById("import-file").onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.txt')) {
            alert("Por favor, selecione um arquivo de texto (.txt)");
            event.target.value = ''; // Limpa o input
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                if (!content.includes('Questão') || !content.includes('Resposta:')) {
                    throw new Error("Formato inválido");
                }
                
                const processedContent = processImportedContent(content);
                if (!processedContent || (Array.isArray(processedContent) && processedContent.length === 0)) {
                    throw new Error("Arquivo vazio ou mal formatado");
                }

                let provas = JSON.parse(localStorage.getItem("provas") || "[]");
                if (Array.isArray(processedContent)) {
                    provas = provas.concat(processedContent);
                } else {
                    provas.push(processedContent);
                }
                
                localStorage.setItem("provas", JSON.stringify(provas));
                alert("Prova importada com sucesso!");
                event.target.value = ''; // Limpa o input
                showSection("list-provas-container");
                renderProvasList();
            } catch (error) {
                alert("Erro ao importar. Verifique se o arquivo segue o formato correto mostrado na tela inicial.");
                console.error(error);
                event.target.value = ''; // Limpa o input
            }
        };
        reader.readAsText(file);
    };

    function processImportedContent(content) {
        try {
            // Primeiro tenta parse direto, caso já seja JSON
            return JSON.parse(content);
        } catch {
            // Se não for JSON, tenta processar como texto
            const lines = content.split('\n').map(l => l.trim());
            const provas = [];
            let currentProva = null;
            let currentQuestion = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;

                if (!currentProva) {
                    // Início de uma nova prova
                    currentProva = {
                        nome: line,
                        tempo: parseInt(lines[++i]) || 0,
                        quiz: []
                    };
                    provas.push(currentProva);
                    continue;
                }

                if (line.startsWith('Questão')) {
                    // Nova questão
                    currentQuestion = {
                        enunciado: line.substring(line.indexOf(' ') + 1),
                        alternativas: [],
                        correta: 0,
                        justificativa: ''
                    };
                    currentProva.quiz.push(currentQuestion);
                    continue;
                }

                if (line.match(/^[A-D]\)/)) {
                    // Alternativa
                    currentQuestion.alternativas.push(line.substring(3).trim());
                    continue;
                }

                if (line.startsWith('Resposta:')) {
                    // Resposta correta
                    const resp = line.substring(9).trim().toUpperCase();
                    currentQuestion.correta = resp.charCodeAt(0) - 65; // Converte A->0, B->1, etc
                    continue;
                }

                if (line.startsWith('Justificativa:')) {
                    // Justificativa
                    currentQuestion.justificativa = line.substring(13).trim();
                    continue;
                }
            }

            return provas;
        }
    }

    // Botão "Iniciar Prova Teste"
    document.getElementById("start-test-btn").onclick = function() {
        const lang = typeof window.currentLang === "string" ? window.currentLang : "ptbr";
        const testNames = {
            ptbr: "Prova de Teste",
            en: "Test Demo",
            es: "Prueba de Demostración",
            fr: "Test Démo",
            it: "Test Dimostrativo"
        };
        const provaTeste = {
            nome: testNames[lang],
            tempo: 10,
            quiz: [
                {
                    enunciado: "Qual é a capital da França?",
                    alternativas: ["Berlim", "Madri", "Paris", "Lisboa"],
                    correta: 2,
                    justificativa: "Paris é a capital da França."
                },
                {
                    enunciado: "Qual é a fórmula da água?",
                    alternativas: ["H2O", "CO2", "O2", "NaCl"],
                    correta: 0,
                    justificativa: "H2O é a fórmula química da água."
                },
                {
                    enunciado: "Quem escreveu 'Dom Casmurro'?",
                    alternativas: ["Machado de Assis", "José de Alencar", "Clarice Lispector", "Jorge Amado"],
                    correta: 0,
                    justificativa: "'Dom Casmurro' foi escrito por Machado de Assis."
                }
            ]
        };
        iniciarProvaSelecionada(provaTeste);
    };

    // ======= Botões de Idioma Corrigidos =======
    const botoesIdioma = {
        "lang-ptbr": "ptbr",
        "lang-en": "en",
        "lang-es": "es",
        "lang-fr": "fr",
        "lang-it": "it"
    };
    for (const [id, lang] of Object.entries(botoesIdioma)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = function() {
                window.currentLang = lang;
                localStorage.setItem("selectedLang", lang);
                if (typeof translatePage === "function") {
                    translatePage(lang);
                }
            };
        }
    }
    const idiomaSalvo = localStorage.getItem("selectedLang") || "ptbr";
    if (typeof translatePage === "function") {
        translatePage(idiomaSalvo);
    }
});