'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useApp } from './AppProvider';
import { api } from '@/lib/api';
import audioManifest from '../../public/audio/manifest.json';

export type InfoKind = 'how-it-works' | 'evidence' | 'privacy' | 'terms' | 'credits' | 'support';
type T = (en: string, pt: string) => string;

const REVIEW = 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0286023';
const ASSET_IDS = ['rain', 'ocean', 'cafe', 'forest', 'fireplace'] as const;
const LABELS: Record<(typeof ASSET_IDS)[number], [string, string]> = {
  rain: ['Rain', 'Chuva'], ocean: ['Ocean waves', 'Ondas do mar'],
  cafe: ['Café', 'Café'], forest: ['Forest', 'Floresta'],
  fireplace: ['Fireplace', 'Lareira'],
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="content-panel"><h2>{title}</h2>{children}</section>;
}

function InternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-button">{children}</Link>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function validatedSupportUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

function ReportForm({ t }: { t: T }) {
  const [link, setLink] = useState('');
  const [reason, setReason] = useState<'copyright' | 'abuse' | 'privacy' | 'other'>('abuse');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('report');
    if (token) setLink(token);
  }, []);
  function parseToken(input: string): string | null {
    const value = input.trim();
    if (/^[0-9a-f]{48}$/i.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.origin !== window.location.origin || !url.pathname.endsWith('/linosbinaural/shared/')) return null;
      const token = url.searchParams.get('token');
      return token && /^[0-9a-f]{48}$/i.test(token) ? token : null;
    } catch { return null; }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setMessage('');
    const token = parseToken(link);
    if (!token) {
      setError(t('Paste a public mix link or its 48-character share token.', 'Cole o link de um mix público ou seu código de compartilhamento de 48 caracteres.'));
      return;
    }
    setBusy(true);
    try {
      await api.report(token, reason, details.trim());
      setMessage(t('Report received. This confirms submission, not a review or removal decision.', 'Denúncia recebida. Isso confirma o envio, não uma decisão de análise ou remoção.'));
      setDetails('');
    } catch {
      setError(t('The report could not be sent. Check the link and connection, then try again.', 'Não foi possível enviar a denúncia. Confira o link e a conexão e tente novamente.'));
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="account-form">
    <label className="form-field">{t('Public mix link or share token', 'Link do mix público ou código de compartilhamento')}
      <input required value={link} onChange={event => setLink(event.target.value)} maxLength={500} autoComplete="off" />
    </label>
    <label className="form-field">{t('Reason', 'Motivo')}
      <select value={reason} onChange={event => setReason(event.target.value as typeof reason)}>
        <option value="abuse">{t('Abuse or harmful content', 'Abuso ou conteúdo prejudicial')}</option>
        <option value="copyright">{t('Copyright', 'Direitos autorais')}</option>
        <option value="privacy">{t('Privacy', 'Privacidade')}</option>
        <option value="other">{t('Other', 'Outro')}</option>
      </select>
    </label>
    <label className="form-field">{t('Details (optional)', 'Detalhes (opcional)')}
      <textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={500} />
    </label>
    <button className="button primary" disabled={busy}>{busy ? t('Sending…', 'Enviando…') : t('Send report', 'Enviar denúncia')}</button>
    {message && <p className="status-message" role="status">{message}</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </form>;
}

export function InfoPage({ kind }: { kind: InfoKind }) {
  const { tr: t } = useApp();
  const supportUrl = validatedSupportUrl();
  const title: Record<InfoKind, [string, string]> = {
    'how-it-works': ['How the listening room works', 'Como funciona a sala de escuta'],
    evidence: ['What the evidence says', 'O que dizem as evidências'],
    privacy: ['Privacy in the listening room', 'Privacidade na sala de escuta'],
    terms: ['Terms of use', 'Termos de uso'],
    credits: ['Made with care', 'Feito com cuidado'],
    support: ['Support and reports', 'Suporte e denúncias'],
  };
  return <main id="main" className="content-page info-page">
    <span className="eyebrow">{t('A NOTE FROM THE LISTENING ROOM', 'UM RECADO DA SALA DE ESCUTA')}</span>
    <h1>{t(...title[kind])}</h1>

    {kind === 'how-it-works' && <>
      <p>{t('Choose a record as a starting point, then make the sound your own. Choosing a record never starts playback; press Play when you are ready.', 'Escolha um disco como ponto de partida e ajuste o som ao seu gosto. Selecionar um disco nunca inicia o áudio; pressione Reproduzir quando quiser.')}</p>
      <Panel title={t('Two tones, two ears', 'Dois tons, dois ouvidos')}>
        <p>{t('Use stereo headphones or earbuds for binaural beats. Each ear receives a slightly different tone, creating a perceived beat at the frequency difference.', 'Use fones de ouvido estéreo para batidas binaurais. Cada ouvido recebe um tom ligeiramente diferente, criando uma batida percebida na frequência da diferença.')}</p>
        <p>{t('Carrier is the center frequency: left = carrier − beat/2; right = carrier + beat/2. At a 300 Hz carrier and an 8 Hz beat, the left ear receives 296 Hz and the right 304 Hz.', 'A portadora é a frequência central: esquerdo = portadora − batida/2; direito = portadora + batida/2. Com portadora de 300 Hz e batida de 8 Hz, o ouvido esquerdo recebe 296 Hz e o direito 304 Hz.')}</p>
        <p>{t('A mono output or one-ear listening does not preserve that separation. Turn binaural tones off for an explicit ambience-only mix; ambience works on speakers without headphones.', 'A saída mono ou a escuta com um só ouvido não preserva essa separação. Desligue os tons binaurais para ouvir apenas os sons ambientes; eles funcionam em alto-falantes sem fones.')}</p>
      </Panel>
      <Panel title={t('The frequency labels', 'As faixas de frequência')}>
        <p>{t('These continuous ranges classify the beat you selected. They do not measure your brain activity or state. EEG band boundaries vary by convention.', 'Estas faixas contínuas classificam a batida escolhida. Elas não medem sua atividade cerebral nem seu estado. Os limites das faixas de EEG variam conforme a convenção.')}</p>
        <ul>
          <li>Delta: 0.5 ≤ f &lt; 4 Hz</li><li>Theta: 4 ≤ f &lt; 8 Hz</li>
          <li>Alpha: 8 ≤ f &lt; 13 Hz</li><li>Beta: 13 ≤ f &lt; 30 Hz</li>
          <li>{t('Gamma-range experiment', 'Experimento na faixa gama')}: 30 ≤ f ≤ 40 Hz</li>
        </ul>
        <p>{t('The 30–40 Hz setting is an experiment in the app, and the 40 Hz cap does not define the full EEG gamma range. At higher differences, some listeners may hear two separate tones rather than a distinct beat.', 'A opção de 30–40 Hz é experimental no aplicativo, e o limite de 40 Hz não define toda a faixa gama do EEG. Em diferenças maiores, algumas pessoas podem ouvir dois tons separados em vez de uma batida nítida.')}</p>
        <InternalLink href="/evidence/">{t('Read the evidence', 'Leia as evidências')}</InternalLink>
      </Panel>
      <Panel title={t('Mix, time, and listen gently', 'Misture, escolha o tempo e ouça com cuidado')}>
        <p>{t('Each ambience has its own level. The master control changes the overall output. A slider percentage is a mixer setting, not a calibrated sound-pressure level or a measure of hearing safety. Start low and adjust to a comfortable level.', 'Cada som ambiente tem seu próprio volume. O controle principal altera a saída geral. A porcentagem do controle é um ajuste da mixagem, não uma medida calibrada de pressão sonora nem de segurança auditiva. Comece baixo e ajuste até ficar confortável.')}</p>
        <p>{t('Sine is the standard tone. Triangle, square, and sawtooth add harmonics; results from sine-tone research do not automatically apply to them.', 'O tom senoidal é o padrão. Tons triangulares, quadrados e dente de serra acrescentam harmônicos; resultados de pesquisas com tons senoidais não se aplicam automaticamente a eles.')}</p>
        <p>{t('Choose a duration or Continuous. A timed session fades out on the audio clock. Pause freezes that clock; Resume continues where it stopped. A browser or device may interrupt audio, especially when a mobile screen locks, so uninterrupted background playback is not guaranteed.', 'Escolha uma duração ou Contínuo. Uma sessão com tempo definido termina com uma redução gradual do som pelo relógio do áudio. Pausar congela esse relógio; Retomar continua de onde parou. O navegador ou aparelho pode interromper o som, especialmente com a tela do celular bloqueada; a reprodução contínua em segundo plano não é garantida.')}</p>
      </Panel>
      <Panel title={t('Your records', 'Seus discos')}>
        <p>{t('Factory records are suggested starting points, not clinical prescriptions. A guest draft stays in this browser. Sign in to save private mixes; publishing one creates a share link you can later revoke.', 'Os discos prontos são pontos de partida, não prescrições clínicas. O rascunho de visitante fica neste navegador. Entre para salvar mixes privados; publicar um deles cria um link que você pode revogar depois.')}</p>
        <InternalLink href="/">{t('Open the listening desk', 'Abrir a mesa de som')}</InternalLink>
      </Panel>
    </>}

    {kind === 'evidence' && <>
      <p>{t('A pleasant listening experience is a valid reason to use this room. The research does not establish a guaranteed mental or medical effect from a chosen beat frequency.', 'Gostar da experiência sonora já é um bom motivo para usar esta sala. A pesquisa não estabelece um efeito mental ou médico garantido para uma frequência escolhida.')}</p>
      <Panel title={t('Perception', 'Percepção')}>
        <p>{t('Presenting nearby tones separately to the ears can produce a perceived binaural beat at their difference frequency. The app generates those two tones; what a person perceives varies, particularly toward the upper end of the range. Headphones preserve the intended channel separation but do not guarantee a cognitive benefit.', 'Apresentar tons próximos separadamente a cada ouvido pode produzir uma batida binaural percebida na frequência da diferença. O aplicativo gera esses dois tons; a percepção varia entre pessoas, sobretudo no limite superior da faixa. Fones preservam a separação pretendida entre canais, mas não garantem benefício cognitivo.')}</p>
      </Panel>
      <Panel title={t('A proposed mechanism', 'Um mecanismo proposto')}>
        <p>{t('Brainwave entrainment proposes that a repeating stimulus changes the brain’s electrical rhythms at the same frequency. Detecting an auditory response is not the same as proving a lasting change in EEG rhythms or a useful change in mood, attention, or sleep.', 'A hipótese de sincronização cerebral propõe que um estímulo repetitivo altere os ritmos elétricos do cérebro na mesma frequência. Detectar uma resposta auditiva não equivale a comprovar uma mudança duradoura nos ritmos do EEG nem uma melhora útil no humor, na atenção ou no sono.')}</p>
      </Panel>
      <Panel title={t('What studies found', 'O que os estudos encontraram')}>
        <p>{t('A 2023 systematic review by Ingendoh, Posny, and Heine included 14 EEG studies: five supported the entrainment hypothesis, eight reported contrary findings, and one had mixed results. The studies differed substantially in sounds, design, and EEG measures, limiting direct comparison. The review does not establish a reliably effective frequency for a particular activity.', 'Uma revisão sistemática de 2023, de Ingendoh, Posny e Heine, incluiu 14 estudos com EEG: cinco apoiaram a hipótese de sincronização, oito trouxeram resultados contrários e um teve resultados mistos. Os estudos diferiram bastante em sons, desenho e medidas de EEG, o que limita a comparação direta. A revisão não estabelece uma frequência comprovadamente eficaz para uma atividade específica.')}{' '}<ExternalLink href={REVIEW}>{t('Read the open-access review', 'Leia a revisão de acesso aberto')}</ExternalLink>.</p>
        <p>{t('The review focused on neurologically healthy adults, passive listening, and pure carrier tones. Its conclusions should not be extended to treatment claims or to the app’s triangle, square, and sawtooth textures.', 'A revisão se concentrou em adultos neurologicamente saudáveis, escuta passiva e tons portadores puros. Suas conclusões não devem ser estendidas a promessas de tratamento nem às texturas triangular, quadrada e dente de serra do aplicativo.')}</p>
      </Panel>
      <Panel title={t('How to use this information', 'Como usar estas informações')}>
        <p>{t('The Delta, Theta, Alpha, Beta, and Gamma-range labels describe the selected difference frequency, not a measured state of the listener. Presets and durations are creative suggestions. Lino’s Binaural is not a treatment for insomnia, ADHD, anxiety, or another condition.', 'Os rótulos Delta, Theta, Alpha, Beta e faixa Gama descrevem a diferença de frequência selecionada, não um estado medido da pessoa. Presets e durações são sugestões criativas. Lino’s Binaural não é tratamento para insônia, TDAH, ansiedade ou outra condição.')}</p>
      </Panel>
    </>}

    {kind === 'privacy' && <>
      <p>{t('You can listen as a guest. Audio is generated and mixed in your browser; your listening choices do not require an account or a network request once needed recordings have loaded.', 'Você pode ouvir sem conta. O áudio é gerado e misturado no navegador; suas escolhas de escuta não exigem conta nem conexão depois que as gravações necessárias carregam.')}</p>
      <Panel title={t('On this device', 'Neste aparelho')}>
        <p>{t('Local storage under the linosbinaural:v1: prefix keeps your draft mix, chosen language, and theme. It never restarts sound automatically. When account services are configured, the Supabase browser client also stores its sign-in session under a namespaced key in local storage so it can refresh your access. That browser-readable session is not an HttpOnly cookie.', 'O armazenamento local com o prefixo linosbinaural:v1: guarda o rascunho, o idioma e o tema. Ele nunca reinicia o som automaticamente. Quando os serviços de conta estão configurados, o cliente Supabase também guarda a sessão de acesso sob uma chave própria no armazenamento local para poder renová-la. Essa sessão, acessível ao navegador, não é um cookie HttpOnly.')}</p>
        <p>{t('This app sets no advertising or analytics cookies. Hosted checkout may use Stripe’s own cookies; see its', 'Este aplicativo não define cookies de publicidade ou análise. A finalização hospedada pode usar cookies do próprio Stripe; consulte sua')} <ExternalLink href="https://stripe.com/privacy">{t('privacy notice', 'política de privacidade')}</ExternalLink>.</p>
      </Panel>
      <Panel title={t('Accounts and saved mixes', 'Contas e mixes salvos')}>
        <p>{t('Supabase handles email and authentication. Signed-in accounts can store private mixes, an optional public display name, and purchase entitlement. A mix is private until you publish it. A public link exposes its title, description, mix settings, and optional display name, never your email. Unpublishing revokes future access through that link, but cannot erase copies someone already downloaded or saved.', 'O Supabase cuida do e-mail e da autenticação. Contas conectadas podem guardar mixes privados, um nome público opcional e o direito de acesso sem anúncios. Um mix é privado até você publicá-lo. O link público mostra título, descrição, ajustes e nome público opcional, nunca seu e-mail. Cancelar a publicação revoga o acesso futuro pelo link, mas não apaga cópias que alguém já baixou ou salvou.')}</p>
        <p>{t('The Account page offers a JSON export and account deletion. Deleting an account removes its saved mixes and public links. If the account service is unavailable, those operations cannot complete until it is restored.', 'A página Conta oferece exportação em JSON e exclusão da conta. Excluir a conta remove os mixes salvos e os links públicos. Se o serviço de conta estiver indisponível, essas ações não poderão ser concluídas até a recuperação do serviço.')}</p>
      </Panel>
      <Panel title={t('Payments and retention', 'Pagamentos e retenção')}>
        <p>{t('If you choose the one-time ad-free purchase, Stripe hosts checkout and processes the payment. The app does not receive full card details. Its server records the transaction reference, amount, currency, status, and account entitlement to handle restoration, refunds, and disputes. Transaction records may remain after account deletion where needed for payment records or legitimate obligations; no fixed retention period is claimed here.', 'Se você escolher a compra única sem anúncios, o Stripe hospeda a finalização e processa o pagamento. O aplicativo não recebe os dados completos do cartão. Seu servidor registra a referência da transação, valor, moeda, status e direito da conta para lidar com restauração, reembolsos e contestações. Registros de transação podem permanecer após a exclusão da conta quando necessários para registros de pagamento ou obrigações legítimas; nenhum prazo fixo de retenção é afirmado aqui.')}</p>
      </Panel>
      <Panel title={t('Sponsorship and tracking', 'Patrocínio e rastreamento')}>
        <p>{t('A single direct sponsor placement is disabled by default. A self-hosted static creative can appear only on the canonical production site after a sponsor and its HTTPS destination are configured, your account is confirmed to be non-entitled, and you explicitly choose Allow in the local privacy preference. Allow and Reject have equal standing; you can change or withdraw your choice there. No sponsor content loads while the account or preference is unresolved, or for an ad-free account.', 'Um único espaço de patrocínio direto fica desativado por padrão. Uma peça estática hospedada pelo próprio site só pode aparecer no endereço oficial de produção depois que o patrocinador e seu destino HTTPS forem configurados, sua conta for confirmada como sem o benefício sem anúncios e você escolher explicitamente Permitir na preferência local de privacidade. Permitir e Rejeitar têm o mesmo peso; você pode alterar ou retirar sua escolha ali. Nenhum conteúdo patrocinado carrega enquanto a conta ou preferência estiver indefinida, nem para uma conta sem anúncios.')}</p>
        <p>{t('The sponsor placement has no third-party ad-network script, tracking pixel, advertising identifier, or automatic refresh. A sponsor link opens an HTTPS destination. We do not run behavioral analytics or create medical profiles. No Google ad network is integrated in this release; this local choice is not a certified consent platform for future ad networks. Any later network integration would require an updated notice and appropriate controls before activation.', 'O espaço patrocinado não usa script de rede publicitária de terceiros, pixel de rastreamento, identificador de publicidade nem atualização automática. O link do patrocinador abre um destino HTTPS. Não fazemos análise comportamental nem criamos perfis médicos. Nenhuma rede de anúncios do Google está integrada nesta versão; esta escolha local não é uma plataforma de consentimento certificada para redes futuras. Uma eventual integração de rede exigiria aviso atualizado e controles adequados antes da ativação.')}</p>
      </Panel>
      <Panel title={t('Questions about your data', 'Dúvidas sobre seus dados')}>
        {supportUrl ? <p>{t('Use the configured support page for privacy requests: ', 'Use a página de suporte configurada para solicitações de privacidade: ')}<ExternalLink href={supportUrl}>{supportUrl}</ExternalLink>.</p> : <p>{t('A direct support contact has not been configured for this installation. Account export and deletion remain available from the Account page when the account service is connected.', 'Um contato direto de suporte ainda não foi configurado nesta instalação. A exportação e a exclusão da conta continuam disponíveis na página Conta quando o serviço de conta está conectado.')}</p>}
        <InternalLink href="/account/">{t('Open Account', 'Abrir Conta')}</InternalLink>
      </Panel>
    </>}

    {kind === 'terms' && <>
      <p>{t('This room is for creative listening. All sounds and mixing controls are free to use with or without a purchase.', 'Esta sala é para escuta criativa. Todos os sons e controles de mixagem são gratuitos, com ou sem compra.')}</p>
      <Panel title={t('Listening and availability', 'Escuta e disponibilidade')}>
        <p>{t('Use a comfortable volume. Mixer percentages are not sound-pressure readings or a hearing-safety guarantee. Stereo headphones are needed for the intended binaural separation; ambience-only listening works without them. Browser, device, or network interruptions may affect playback and account features.', 'Use um volume confortável. As porcentagens da mixagem não são leituras de pressão sonora nem garantia de segurança auditiva. Fones estéreo são necessários para a separação binaural pretendida; ouvir só sons ambientes funciona sem eles. Interrupções do navegador, aparelho ou conexão podem afetar a reprodução e os recursos de conta.')}</p>
        <p>{t('This product does not diagnose, treat, or promise improvement in sleep, attention, anxiety, or another health condition. Preset names and durations are suggestions, not prescriptions or claims about biological cycles.', 'Este produto não diagnostica, trata nem promete melhora do sono, da atenção, da ansiedade ou de outra condição de saúde. Nomes e durações dos presets são sugestões, não prescrições nem afirmações sobre ciclos biológicos.')}</p>
      </Panel>
      <Panel title={t('Your content and sharing', 'Seu conteúdo e compartilhamento')}>
        <p>{t('Your saved mixes are private by default. Publishing one makes its title, description, settings, and optional display name available to anyone with its link. Do not publish unlawful, infringing, or privacy-invasive text. You can unpublish to revoke future link access; downloaded copies are outside this app’s control. Public mixes may be reported and removed when appropriate.', 'Seus mixes salvos são privados por padrão. Publicar um deles torna título, descrição, ajustes e nome público opcional acessíveis a quem tiver o link. Não publique texto ilegal, que viole direitos autorais ou a privacidade de outras pessoas. Você pode cancelar a publicação para revogar acesso futuro pelo link; cópias baixadas estão fora do controle do aplicativo. Mixes públicos podem ser denunciados e removidos quando apropriado.')}</p>
      </Panel>
      <Panel title={t('One-time ad-free purchase', 'Compra única sem anúncios')}>
        <p>{t('An account may buy ad-free access once for US$5.00 or R$20.00, with the currency chosen explicitly at checkout. These are separate fixed prices, not an exchange-rate conversion. There is no subscription and no paid sound library. The purchase belongs to the signed-in account and can be restored by signing in on another device after payment is confirmed.', 'Uma conta pode comprar acesso sem anúncios uma vez por US$5,00 ou R$20,00, escolhendo a moeda na finalização. São preços fixos separados, não uma conversão cambial. Não há assinatura nem biblioteca de sons paga. A compra pertence à conta conectada e pode ser recuperada ao entrar em outro aparelho depois da confirmação do pagamento.')}</p>
        <p>{t('Stripe handles checkout. A return page alone never grants the entitlement; the server verifies payment. Refunds or disputes may change ad-free status. No promise of perpetual infrastructure or uninterrupted service is made. Purchases are unavailable when payment configuration is not active; free listening continues.', 'O Stripe processa a finalização. Voltar à página não concede o direito por si só; o servidor verifica o pagamento. Reembolsos ou contestações podem alterar o status sem anúncios. Não prometemos infraestrutura perpétua nem serviço ininterrupto. Compras ficam indisponíveis quando a configuração de pagamento não está ativa; a escuta gratuita continua.')}</p>
        <InternalLink href="/ad-free/">{t('See ad-free choices', 'Ver opções sem anúncios')}</InternalLink>
      </Panel>
      <Panel title={t('Privacy and assistance', 'Privacidade e ajuda')}>
        <p>{t('Read the Privacy page for account, local storage, sharing, payment, and advertising details. Use Support to report a public mix or find the configured support channel.', 'Leia Privacidade para saber sobre conta, armazenamento local, compartilhamento, pagamento e anúncios. Use Suporte para denunciar um mix público ou encontrar o canal de atendimento configurado.')}</p>
        <InternalLink href="/privacy/">{t('Read Privacy', 'Ler Privacidade')}</InternalLink>{' · '}<InternalLink href="/support/">{t('Open Support', 'Abrir Suporte')}</InternalLink>
      </Panel>
    </>}

    {kind === 'credits' && <>
      <p>{t('The listening room, record covers, icon set, and mark are original project artwork built from editable pixel geometry. The artwork source is kept with the project; its manifest designates the original construction CC0.', 'A sala de escuta, as capas dos discos, os ícones e a marca são artes originais do projeto construídas com geometria de pixels editável. O código-fonte da arte acompanha o projeto; seu manifesto designa a criação original como CC0.')}</p>
      <Panel title={t('Curated environmental recordings', 'Gravações ambientais selecionadas')}>
        <p>{t('Each sound below comes from a distinct recording. The local file is an excerpt encoded for the web; loop boundaries are crossfaded in the player. Source and license details are recorded in the audio manifest.', 'Cada som abaixo vem de uma gravação diferente. O arquivo local é um trecho codificado para a web; o reprodutor suaviza a união do loop. Fontes e licenças constam no manifesto de áudio.')}</p>
        <ul>{ASSET_IDS.map(id => {
          const item = audioManifest.assets[id];
          return <li key={id}><strong>{t(...LABELS[id])}</strong> — {item.creator}. <ExternalLink href={item.source}>{t('Source', 'Fonte')}</ExternalLink>{' · '}<ExternalLink href={item.licenseUrl}>{item.license}</ExternalLink>. {id === 'ocean' ? t('Excerpt and MP3 adaptation by Lino’s Binaural.', 'Trecho e adaptação MP3 por Lino’s Binaural.') : null}</li>;
        })}</ul>
        <p>{t('White, pink, and brown noise are generated in the app; they are not recordings renamed as different environments.', 'Os ruídos branco, rosa e marrom são gerados no aplicativo; não são gravações renomeadas como ambientes diferentes.')}</p>
      </Panel>
      <Panel title={t('Typography and references', 'Tipografia e referências')}>
        <p>{t('Nunito by the Nunito Project Authors and Pixelify Sans by the Pixelify Sans Project Authors are self-hosted under the SIL Open Font License 1.1.', 'Nunito, dos autores do projeto Nunito, e Pixelify Sans, dos autores do projeto Pixelify Sans, são hospedadas localmente sob a SIL Open Font License 1.1.')}{' '}<ExternalLink href="https://github.com/googlefonts/nunito">{t('Nunito source', 'Fonte do Nunito')}</ExternalLink>{' · '}<ExternalLink href="https://github.com/eifetx/Pixelify-Sans">{t('Pixelify Sans source', 'Fonte do Pixelify Sans')}</ExternalLink>.</p>
        <p>{t('The cozy room and record-shop idea drew conceptual inspiration from familiar listening spaces and pixel-game craft; no game artwork, characters, music, or interface assets were copied.', 'A sala acolhedora e a loja de discos buscaram inspiração conceitual em espaços de escuta e no cuidado dos jogos em pixels; nenhuma arte, personagem, música ou interface de outro jogo foi copiada.')}</p>
      </Panel>
    </>}

    {kind === 'support' && <>
      <p>{t('Need help with an account, a purchase, or a public mix? The actions below show what this installation can actually do.', 'Precisa de ajuda com uma conta, compra ou mix público? As ações abaixo mostram o que esta instalação pode fazer.')}</p>
      <Panel title={t('Account and purchase help', 'Ajuda com conta e compra')}>
        <p>{t('The Account page lets you request a recovery email, inspect ad-free status, export stored data, or delete your account when account services are connected. If a confirmed purchase has not appeared, return to Account and use Check again on its checkout status.', 'Na página Conta, você pode pedir e-mail de recuperação, ver o status sem anúncios, exportar dados ou excluir a conta quando os serviços de conta estiverem conectados. Se uma compra confirmada ainda não aparecer, volte à Conta e use Verificar novamente no status da compra.')}</p>
        <InternalLink href="/account/">{t('Open Account', 'Abrir Conta')}</InternalLink>
        {supportUrl ? <p>{t('For a question that needs a person, use the configured support page: ', 'Para uma dúvida que precisa de atendimento, use a página de suporte configurada: ')}<ExternalLink href={supportUrl}>{supportUrl}</ExternalLink>.</p> : <p>{t('A direct support contact has not been configured for this installation. Do not send payment or account details through a public-mix report.', 'Um contato direto de suporte não foi configurado nesta instalação. Não envie dados de pagamento ou da conta por uma denúncia de mix público.')}</p>}
      </Panel>
      <Panel title={t('Report a public mix', 'Denunciar um mix público')}>
        <p>{t('Use this form for copyright, abuse, privacy, or other problems with a published mix. Include its share link and only the details needed to explain the issue. Do not include passwords, card numbers, or private medical information.', 'Use este formulário para problemas de direitos autorais, abuso, privacidade ou outros relacionados a um mix publicado. Inclua o link compartilhado e somente os detalhes necessários para explicar o problema. Não informe senhas, números de cartão nem dados médicos privados.')}</p>
        <ReportForm t={t} />
      </Panel>
    </>}
  </main>;
}
