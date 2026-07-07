// Feature flags. Flip to re-enable a feature that isn't ready to launch.
//
// AUTOMATIONS: disparos proativos (recuperação, anti-falta, horário ocioso).
// Fora do lançamento por enquanto — depende de templates aprovados pela Meta
// (WhatsApp) e ainda vai ser reestruturado. Quando ligar, reaparece a aba
// Automações, a rota volta a abrir e o cron volta a rodar. Nada foi removido.
export const AUTOMATIONS_ENABLED = false;

// INSTAGRAM: DM do Instagram atendido pela mesma IA. Fora do lançamento por
// enquanto — depende de App na Meta + App Review (não tem atalho tipo 360dialog).
// Quando ligar, reaparece o card em Integrações e o webhook volta a processar.
export const INSTAGRAM_ENABLED = false;
