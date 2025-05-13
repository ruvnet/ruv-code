import { useState } from 'react';
import { WizardStep, PluginForm, FormErrors } from '../types';
import { 
  validateBasicInfo, 
  validateConfiguration, 
  validateAdvanced 
} from '../utils/validation';

interface UseWizardNavigationProps {
  form: PluginForm;
  setFormErrors: (errors: FormErrors) => void;
  onStartScaffolding: () => void;
  t: (key: string) => string;
}

/**
 * Custom hook for managing wizard navigation and step validation
 * 
 * @param props Form data and callbacks
 * @returns Current step and navigation methods
 */
export function useWizardNavigation(props: UseWizardNavigationProps) {
  const { form, setFormErrors, onStartScaffolding, t } = props;
  
  // Wizard step tracking
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  
  /**
   * Navigate to the next step, validating the current step first
   * 
   * @returns true if validation passed and navigation happened
   */
  const nextStep = (): boolean => {
    if (currentStep === 'basic') {
      // Validate basic info
      const newErrors = validateBasicInfo(form, t);
      
      if (Object.keys(newErrors).length > 0) {
        setFormErrors(newErrors);
        return false;
      }
      
      setCurrentStep('configuration');
      return true;
    } 
    else if (currentStep === 'configuration') {
      // Validate config
      const newErrors = validateConfiguration(form, t);
      
      if (Object.keys(newErrors).length > 0) {
        setFormErrors(newErrors);
        return false;
      }
      
      setCurrentStep('advanced');
      return true;
    } 
    else if (currentStep === 'advanced') {
      // Validate advanced options
      const newErrors = validateAdvanced();
      
      if (Object.keys(newErrors).length > 0) {
        setFormErrors(newErrors);
        return false;
      }
      
      setCurrentStep('scaffold');
      // Start creating plugin scaffolding
      onStartScaffolding();
      return true;
    } 
    else if (currentStep === 'scaffold') {
      // If retry requested from the scaffold step
      onStartScaffolding();
      return true;
    }
    
    return false;
  };
  
  /**
   * Navigate to the previous step
   */
  const prevStep = () => {
    if (currentStep === 'configuration') {
      setCurrentStep('basic');
    } 
    else if (currentStep === 'advanced') {
      setCurrentStep('configuration');
    } 
    else if (currentStep === 'scaffold') {
      setCurrentStep('advanced');
    }
  };
  
  /**
   * Set current step directly (use with caution)
   * 
   * @param step The step to navigate to
   */
  const setStep = (step: WizardStep) => {
    setCurrentStep(step);
  };
  
  return {
    currentStep,
    nextStep,
    prevStep,
    setStep
  };
}