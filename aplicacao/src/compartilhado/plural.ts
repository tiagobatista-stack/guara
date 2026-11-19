/** "1 ponto", "2 pontos": número e palavra concordando (o zero vai no plural, como em "0 pontos"). */
export const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
