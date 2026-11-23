// Rótulos abreviados SÓ para o roteiro impresso (a tela e o relatório usam o texto completo do questionário). Cada abreviação mantém o sentido
// e vale para ganhar linhas na inspeção de 2 páginas; um teste garante que o id existe e que o rótulo é mais curto que o original.

/** Conferência prévia: o resumo impresso usa só estes rótulos (id → rótulo). */
export const ROTULO_PREVIA: Readonly<Record<string, string>> = {
  'C-1.11': 'CAR-MT (SIMCAR)', 'C-1.11.1': 'N.º CAR', 'C-1.12': 'CAR federal', 'C-1.12.1': 'N.º recibo CAR federal',
  'C-2.1': 'CTE', 'C-2.1.1': 'Cert. regularidade CTE', 'C-2.2': 'CTF', 'C-2.2.1': 'N.º CTF', 'C-2.2.2': 'Cód. atividade CTF', 'C-2.2.3': 'Cert. regularidade CTF',
  'C-2.3': 'Licença ambiental', 'C-2.3.1': 'Tipo de licença', 'C-2.3.2': 'Outro tipo de licença', 'C-2.3.3': 'N.º licença', 'C-2.3.4': 'Validade da licença',
  'C-2.4.1': 'Autoriz. desmatamento', 'C-2.4.1.1': 'N.º autoriz. desmatamento',
  'C-2.4.2': 'Autoriz. supressão nativa', 'C-2.4.2.1': 'N.º autoriz. supressão',
  'C-2.4.3': 'Autoriz. exploração florestal', 'C-2.4.3.1': 'N.º autoriz. exploração',
  'C-2.4.4': 'Autoriz. manejo florestal', 'C-2.4.4.1': 'N.º autoriz. manejo',
  'C-2.4.5': 'Autoriz. intervenção em APP', 'C-2.4.5.1': 'N.º autoriz. APP',
  'C-2.4.6': 'Autoriz. abertura de estradas', 'C-2.4.6.1': 'N.º autoriz. estradas',
  'C-2.5': 'DLA', 'C-2.5.1': 'N.º DLA', 'C-2.5.2': 'Validade da DLA', 'C-2.6': 'Outorga de água', 'C-2.8': 'Termo de recuperação de área',
  'C-2.9': 'Registro no MAPA', 'C-2.9.1': 'N.º registro MAPA', 'C-2.10': 'Registro no INDEA', 'C-2.10.1': 'N.º registro INDEA', 'C-2.12': 'Autoriz. MAPA para outra UF',
};

/** Fontes da conferência com nome longo, abreviadas no resumo impresso. */
export const FONTE_CURTA: Readonly<Record<string, string>> = { 'Consulta pública CTF/IBAMA': 'CTF/IBAMA', 'Geoportal SEMA-MT': 'Geoportal', 'Sistema de outorga': 'Outorga' };

/** Inspeção de campo: só as perguntas longas (as demais saem com o texto original). */
export const ROTULO_CAMPO: Readonly<Record<string, string>> = {
  'C-1.7.1': 'Responsável notificado, com prazo para atualização?',
  'C-1.8': 'Responsável(is) técnico(s) qualificado(s) no auto, com registro profissional (CREA) conferido?',
  'C-1.10': 'Gerente, capataz ou responsável que acompanhou a vistoria qualificado no auto?',
  'C-1.16': 'Documentos citados (CPF, RG, CNPJ, endereço, alvará, contratos) fotografados ou copiados?',
  'C-3.3': 'ART atualizada do eng. agrônomo RT da empresa e dos técnicos do acompanhamento presencial (se aplicável)?',
  'C-3.4': 'Receituário(s) agronômico(s) apresentado(s) (produtos aplicados ou em estoque)?',
  'C-3.4.3': 'Receituário com informações detalhadas (usuário, propriedade, diagnóstico, produto, cultura, doses, modalidade, época)?',
  'C-3.5.1': 'Planilha digital com a compilação dos relatórios operacionais apresentada (se solicitada)?',
  'C-3.7': 'Certificado de Aeronavegabilidade e outros registros na ANAC apresentados?',
  'C-3.8': 'Autorização para operar (SAE/ANAC) apresentada?',
  'C-3.9': 'Análise do SGSO de cada pista utilizada apresentada?',
  'C-4.2.1': 'Depósito de agrotóxicos no aeródromo conforme a legislação estadual?',
  'C-4.3.3': '(Vencido há menos de 6 meses) Responsável notificado para recolhimento?',
  'C-4.5': 'Agrotóxicos comprados há mais de 1 ano sem comprovação de uso ou destinação?',
  'C-4.9.1': 'Ponto de abastecimento conforme Res. ANP 12/2007 e licenciamento (se capacidade > 15 m³)?',
  'C-5.14': '(Antes de entrar nos locais de uso) Aplicações totalmente paralisadas?',
  'C-6.2.1': 'Capacidade operacional conforme Anexo 6 da IN MAPA 02/2008?',
  'C-6.2.2': 'Pátio e sistema de oxidação funcionais e íntegros?',
  'C-6.4.3': 'Tubulação de destino dos efluentes em bom estado?',
  'C-6.4.4': 'Tubulação própria para água pluvial, independente do efluente de lavagem?',
  'C-7.2': 'Embalagens vazias descartadas de forma irregular (sede, RL/APP/corpos d\'água, lavouras, estradas)?',
  'C-7.4': 'Comprovantes de logística reversa (nota fiscal, recibo InPEV, nota de entrega)?',
  'C-7.5': '(Registrados no Brasil, situação irregular) Autuado notificado a entregar em centrais ou postos autorizados?',
  'C-7.6': '(Sem registro, origem estrangeira) Encaminhados à Polícia Civil?',
  'C-7.6.1': 'Se impossível: coleta de amostra, apreensão e depósito com o autuado, com notificação para destruição correta?',
  'C-7.7': '(Sem registro, origem nacional: falsificados) Apreensão e depósito com o autuado, com notificação para destruição correta?',
  'C-7.8': 'Fiel depositário (autuado) orientado a manter o material em depósito adequado (NBR 9843/2013)?',
  'C-7.8.1': 'Sem depósito adequado: condições mínimas determinadas (coberto, ventilado, impermeável, acesso restrito, longe de alimentos)?',
};
