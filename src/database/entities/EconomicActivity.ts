import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_ECONOMIC_ACTIVITY_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_ECONOMIC_ACTIVITY_DATE", ["date"])
@Entity({ name: "economic_activity" })
export class EconomicActivity extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "residents_16plus_total" })
  residents16plusTotal!: number;

  @Column({ type: "int", name: "active_excl_students" })
  activeExclStudents!: number;

  @Column({ type: "int", name: "active_excl_students_employed" })
  activeExclStudentsEmployed!: number;

  @Column({ type: "int", name: "active_excl_students_employee" })
  activeExclStudentsEmployee!: number;

  @Column({ type: "int", name: "active_excl_students_employee_part_time" })
  activeExclStudentsEmployeePartTime!: number;

  @Column({ type: "int", name: "active_excl_students_employee_full_time" })
  activeExclStudentsEmployeeFullTime!: number;

  @Column({ type: "int", name: "active_excl_students_self_emp_with_employees" })
  activeExclStudentsSelfEmpWithEmployees!: number;

  @Column({
    type: "int",
    name: "active_excl_students_self_emp_with_employees_part_time",
  })
  activeExclStudentsSelfEmpWithEmployeesPartTime!: number;

  @Column({
    type: "int",
    name: "active_excl_students_self_emp_with_employees_full_time",
  })
  activeExclStudentsSelfEmpWithEmployeesFullTime!: number;

  @Column({ type: "int", name: "active_excl_students_self_emp_no_employees" })
  activeExclStudentsSelfEmpNoEmployees!: number;

  @Column({
    type: "int",
    name: "active_excl_students_self_emp_no_employees_part_time",
  })
  activeExclStudentsSelfEmpNoEmployeesPartTime!: number;

  @Column({
    type: "int",
    name: "active_excl_students_self_emp_no_employees_full_time",
  })
  activeExclStudentsSelfEmpNoEmployeesFullTime!: number;

  @Column({ type: "int", name: "active_excl_students_unemployed" })
  activeExclStudentsUnemployed!: number;

  @Column({ type: "int", name: "active_full_time_student" })
  activeFullTimeStudent!: number;

  @Column({ type: "int", name: "active_full_time_student_employed" })
  activeFullTimeStudentEmployed!: number;

  @Column({ type: "int", name: "active_full_time_student_employee" })
  activeFullTimeStudentEmployee!: number;

  @Column({ type: "int", name: "active_full_time_student_employee_part_time" })
  activeFullTimeStudentEmployeePartTime!: number;

  @Column({ type: "int", name: "active_full_time_student_employee_full_time" })
  activeFullTimeStudentEmployeeFullTime!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_with_employees",
  })
  activeFullTimeStudentSelfEmpWithEmployees!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_with_employees_part_time",
  })
  activeFullTimeStudentSelfEmpWithEmployeesPartTime!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_with_employees_full_time",
  })
  activeFullTimeStudentSelfEmpWithEmployeesFullTime!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_no_employees",
  })
  activeFullTimeStudentSelfEmpNoEmployees!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_no_employees_part_time",
  })
  activeFullTimeStudentSelfEmpNoEmployeesPartTime!: number;

  @Column({
    type: "int",
    name: "active_full_time_student_self_emp_no_employees_full_time",
  })
  activeFullTimeStudentSelfEmpNoEmployeesFullTime!: number;

  @Column({ type: "int", name: "active_full_time_student_unemployed" })
  activeFullTimeStudentUnemployed!: number;

  @Column({ type: "int" })
  inactive!: number;

  @Column({ type: "int", name: "inactive_retired" })
  inactiveRetired!: number;

  @Column({ type: "int", name: "inactive_student" })
  inactiveStudent!: number;

  @Column({ type: "int", name: "inactive_home_or_family" })
  inactiveHomeOrFamily!: number;

  @Column({ type: "int", name: "inactive_long_term_sick_or_disabled" })
  inactiveLongTermSickOrDisabled!: number;

  @Column({ type: "int", name: "inactive_other" })
  inactiveOther!: number;
}
